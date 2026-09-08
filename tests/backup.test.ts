import { describe, expect, it } from 'vitest'
import { createServices } from '../src/services/create-services'
import { createMemoryUserRepository } from '../src/repositories/memory-user.repository'
import { parseCatalog } from '../src/utils/validate-catalog'
import generated from '../src/data/exercises.generated.json'
import { prescribeExercise } from '../src/algorithms/prescribe-exercise'
import type { UserProfile } from '../src/types/profile'
const catalog = parseCatalog(generated)
const profile: UserProfile = {
  id: 'local',
  goal: 'muscle-gain',
  ability: 'beginner',
  availableEquipment: ['Bodyweight', 'Machine'],
  trainingDays: [1, 3, 5],
}
async function fixture() {
  const users = createMemoryUserRepository(),
    api = createServices({ users })
  await api.profile.save(profile)
  await api.recommendations.generate('2026-09-07')
  const prescription = prescribeExercise(
    catalog.find((e) => e.id === 'machine-row')!,
    profile,
    [],
    '2026-09-07',
  )
  const draft = await api.training.open('machine-row', '2026-09-07', prescription)
  draft.rows[0]!.reps = '10'
  draft.rows[0]!.kg = '20'
  draft.rows[0]!.completed = true
  await api.training.complete(draft)
  const core = prescribeExercise(
    catalog.find((e) => e.id === 'plank')!,
    profile,
    [],
    '2026-09-07',
  )
  await api.training.saveDraft(await api.training.open('plank', '2026-09-07', core))
  return { api, users }
}
describe('versioned backups', () => {
  it('round-trips profile, plans, records and unfinished drafts', async () => {
    const { api } = await fixture()
    const text = await api.backup.export()
    const data = await api.backup.preview(text)
    const destination = createServices()
    await destination.backup.restore(data)
    const restored = JSON.parse(await destination.backup.export())
    expect({ ...restored, exportedAt: data.exportedAt }).toEqual(data)
  })
  it.each(['{broken', '{"version":0}', '{"version":99}'])(
    'rejects corrupt or unsupported versions without replacing data: %s',
    async (text) => {
      const { api, users } = await fixture()
      const before = await users.snapshot()
      await expect(api.backup.preview(text)).rejects.toThrow()
      const after = await users.snapshot()
      expect({ ...after, exportedAt: before.exportedAt }).toEqual(before)
    },
  )
  it.each([
    'duplicate',
    'unknown-exercise',
    'invalid-load',
    'other-profile',
    'date-gap',
    'duplicate-draft',
  ])('rejects invalid relationships: %s', async (kind) => {
    const { api, users } = await fixture()
    const backup = await users.snapshot()
    if (kind === 'duplicate') backup.records.push(backup.records[0]!)
    if (kind === 'unknown-exercise') backup.records[0]!.exerciseId = 'missing'
    if (kind === 'invalid-load')
      backup.records[0]!.sets[0]!.load = { kind: 'external', kg: -1, basis: 'machine-stack' }
    if (kind === 'other-profile') backup.records[0]!.profileId = 'other'
    if (kind === 'date-gap') backup.plans[0]!.days[1].date = '2026-09-15'
    if (kind === 'duplicate-draft') backup.drafts.push(backup.drafts[0]!)
    await expect(api.backup.restore(backup)).rejects.toThrow()
    expect(await users.listRecords(profile.id)).toHaveLength(1)
  })
  it('propagates storage failure while preserving the original snapshot', async () => {
    const { api, users } = await fixture()
    const backup = await users.snapshot()
    const failed = createServices({
      users: {
        ...users,
        replace: async () => {
          throw new Error('quota')
        },
      },
    })
    await expect(failed.backup.restore(backup)).rejects.toThrow('quota')
    expect((await api.training.list(profile.id))[0]).toEqual(backup.records[0])
  })
})
