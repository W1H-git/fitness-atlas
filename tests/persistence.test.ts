import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { openDB } from 'idb'
import { createIndexedDBRepository } from '../src/repositories/indexeddb-training.repository'
import { createProfileStorage } from '../src/infrastructure/storage/profile-storage'
import { createServices } from '../src/services/create-services'
import type { UserProfile } from '../src/types/profile'
import type { TrainingDraft } from '../src/types/local-data'
import { trainingId } from '../src/types/local-data'
import { prescribeExercise } from '../src/algorithms/prescribe-exercise'
import generated from '../src/data/exercises.generated.json'
import { parseCatalog } from '../src/utils/validate-catalog'
const exercises = parseCatalog(generated)
const profile: UserProfile = {
  id: 'local',
  goal: 'muscle-gain',
  ability: 'beginner',
  availableEquipment: ['Bodyweight', 'Dumbbell', 'Machine'],
  trainingDays: [1, 3, 5],
}
const prescription = prescribeExercise(
  exercises.find((e) => e.id === 'machine-row')!,
  profile,
  [],
  '2026-09-07',
)
function storage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}
async function fixture() {
  const name = 'test-' + crypto.randomUUID(),
    local = storage()
  const profiles = createProfileStorage(local, name + ':')
  const users = createIndexedDBRepository(profiles, name),
    api = createServices({ users })
  await api.profile.save(profile)
  return { name, local, profiles, users, api }
}
async function draft(api: ReturnType<typeof createServices>): Promise<TrainingDraft> {
  const value = await api.training.open('machine-row', '2026-09-07', prescription)
  value.equipmentKey = 'school-machine-A'
  value.availableWeights = '10, 12, 14'
  value.rows.forEach((row) => {
    row.reps = '12'
    row.kg = '10'
    row.remainingReps = '2'
    row.completed = true
  })
  return value
}
describe('persistent repository', () => {
  it('recovers profile, adjusted plan and blank-input draft in a fresh repository', async () => {
    const { name, profiles, api } = await fixture()
    const plan = await api.recommendations.generate('2026-09-07')
    const day = plan.days[0]
    if (day.kind !== 'training') throw new Error('training expected')
    await api.recommendations.adjust(
      profile.id,
      day.date,
      { ...day.prescriptions[0]!, sets: 4 },
      day.date,
    )
    const value = await draft(api)
    value.rows[0]!.reps = ''
    await api.training.saveDraft(value)
    const recovered = createIndexedDBRepository(profiles, name)
    expect(await recovered.getProfile()).toEqual(profile)
    const saved = await recovered.getPlan(profile.id, plan.weekStart)
    expect(saved?.days[0].kind === 'training' && saved.days[0].prescriptions[0]!.sets).toBe(4)
    expect((await recovered.getDraft(value.id))?.rows[0]?.reps).toBe('')
  })
  it('commits idempotently, removes draft and updates plan completion in one transaction', async () => {
    const { users, api } = await fixture()
    const plan = await api.recommendations.generate('2026-09-07')
    plan.days[0] = {
      date: '2026-09-07',
      kind: 'training',
      muscles: ['Back'],
      prescriptions: [prescription],
      status: 'planned',
    }
    await users.savePlan(plan)
    const value = await draft(api)
    await api.training.saveDraft(value)
    await Promise.all([api.training.complete(value), api.training.complete(value)])
    expect(await users.listRecords(profile.id)).toHaveLength(1)
    expect(await users.getDraft(value.id)).toBeNull()
    const saved = await users.getPlan(profile.id, plan.weekStart)
    expect(saved?.days[0]).toMatchObject({ status: 'completed' })
    await users.saveDraft(value)
    expect(await users.getDraft(value.id)).toBeNull()
  })
  it('rejects invalid actual values without discarding the recoverable draft', async () => {
    const { api, users } = await fixture()
    const value = await draft(api)
    value.rows[0]!.kg = ''
    value.rows[1]!.completed = false
    await api.training.saveDraft(value)
    await expect(api.training.complete(value)).rejects.toThrow()
    expect(await users.listRecords(profile.id)).toEqual([])
    expect(await users.getDraft(value.id)).toEqual(value)
  })
  it('does not show success when storage is unavailable', async () => {
    const users = createIndexedDBRepository(
      createProfileStorage({
        getItem: () => null,
        setItem: () => {
          throw new Error('quota')
        },
      }),
      'quota-' + crypto.randomUUID(),
    )
    await expect(users.saveProfile(profile)).rejects.toThrow('quota')
    expect(await users.getProfile()).toBeNull()
  })
  it('aborts a failed replacement transaction and preserves the previous active dataset', async () => {
    const { users, api } = await fixture()
    const value = await draft(api)
    await api.training.complete(value)
    const original = await users.snapshot()
    const broken = structuredClone(original)
    // A non-cloneable record simulates an IndexedDB write failure after staging the profile.
    Object.assign(broken.records[0]!, { bad: () => {} })
    await expect(users.replace(broken)).rejects.toThrow()
    const after = await users.snapshot()
    expect(after.records).toEqual(original.records)
    expect(after.profile).toEqual(profile)
  })
  it('refuses writes from an older tab following a backup restore', async () => {
    const { users, profiles, name } = await fixture()
    const stale = createIndexedDBRepository(profiles, name)
    await stale.getProfile()
    await users.replace(await users.snapshot())
    await expect(stale.saveProfile({ ...profile, goal: 'fat-loss' })).rejects.toThrow('其他页面')
    expect(await users.getProfile()).toEqual(profile)
  })
  it('creates version 1 stores and rejects a newer database without deleting it', async () => {
    const name = 'future-' + crypto.randomUUID()
    const future = await openDB(name, 2, {
      upgrade(db) {
        db.createObjectStore('future')
      },
    })
    future.close()
    const users = createIndexedDBRepository(createProfileStorage(storage()), name)
    await expect(users.getProfile()).rejects.toThrow()
    const check = await openDB(name)
    expect(check.version).toBe(2)
    expect(check.objectStoreNames.contains('future')).toBe(true)
    check.close()
  })
  it('uses a stable record id across reloads', async () => {
    const { api } = await fixture()
    expect((await draft(api)).id).toBe(trainingId(profile.id, '2026-09-07', 'machine-row'))
  })
})
