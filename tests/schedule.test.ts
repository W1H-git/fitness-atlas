import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { parseCatalog } from '../src/utils/validate-catalog'
import generated from '../src/data/exercises.generated.json'
import { equipmentLabels } from '../src/types/exercise'
import type { Equipment } from '../src/types/exercise'
import type { UserProfile, Weekday } from '../src/types/profile'
import type { TrainingRecord } from '../src/types/training'
import { generateWeek } from '../src/algorithms/generate-week'
import { recommendMuscles, musclesOverlap } from '../src/algorithms/recommend-muscles'
import { parseProfile } from '../src/utils/validate-profile'
import { addDays, daysBetween, localDate, weekStart } from '../src/utils/local-date'
import { createServices } from '../src/services/create-services'
import { createMemoryUserRepository } from '../src/repositories/memory-user.repository'
import { useServicesStore } from '../src/stores/services.store'

const exercises = parseCatalog(generated)
const profile: UserProfile = {
  id: 'local',
  goal: 'muscle-gain',
  ability: 'beginner',
  availableEquipment: Object.keys(equipmentLabels) as Equipment[],
  trainingDays: [1, 3, 5],
}
const input = { profile, exercises, records: [], today: '2026-09-07', weekStart: '2026-09-07' }
function actual(date: string, exerciseId = 'machine-chest-press'): TrainingRecord {
  return {
    id: 'record',
    profileId: 'local',
    exerciseId,
    date,
    performedAt: date + 'T10:00:00+08:00',
    status: 'completed',
    equipmentKey: 'gym-A',
    notes: '',
    sets: [
      {
        id: '1',
        measurement: 'reps',
        reps: 10,
        completed: true,
        remainingReps: 2,
        load: { kind: 'external', basis: 'machine-stack', kg: 20 },
      },
    ],
  }
}
describe('calendar rules', () => {
  it('uses local dates and crosses leap days, month and year boundaries', () => {
    expect(localDate(new Date(2026, 8, 7, 0, 1))).toBe('2026-09-07')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(weekStart('2027-01-01')).toBe('2026-12-28')
    const plan = generateWeek({ ...input, today: '2026-12-28', weekStart: '2026-12-28' })
    expect(plan.days.map((day) => day.date)).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ])
    expect(() => addDays('2026-02-29', 1)).toThrow()
  })
  it.each([
    [1, 2, 5],
    [1, 3, 7],
    [1, 1, 5],
    [1, 3],
  ] as Weekday[][])('rejects invalid beginner selection %s', (...days) => {
    expect(() => parseProfile({ ...profile, trainingDays: days })).toThrow()
  })
  it('accepts a valid Sunday plan and requires four distinct intermediate days', () => {
    expect(parseProfile({ ...profile, trainingDays: [2, 4, 7] }).trainingDays).toEqual([2, 4, 7])
    expect(() => parseProfile({ ...profile, ability: 'intermediate' })).toThrow()
  })
  it.each(['beginner', 'intermediate', 'advanced'] as const)(
    'generates a complete deterministic %s schedule',
    (ability) => {
      const data = {
        ...input,
        profile: {
          ...profile,
          ability,
          trainingDays:
            ability === 'beginner' ? ([1, 3, 5] as Weekday[]) : ([1, 2, 4, 6] as Weekday[]),
        },
      }
      const plan = generateWeek(data)
      expect(generateWeek(data)).toEqual(plan)
      const training = plan.days.filter((day) => day.kind === 'training')
      expect(training).toHaveLength(ability === 'beginner' ? 3 : 4)
      expect(plan.days.filter((day) => day.kind === 'rest')).toHaveLength(
        ability === 'beginner' ? 4 : 3,
      )
      for (const day of training) {
        expect(day.prescriptions).toHaveLength(4)
        expect(new Set(day.prescriptions.map((p) => p.exerciseId)).size).toBe(4)
        for (const other of training) {
          if (daysBetween(day.date, other.date) === 1)
            expect(day.muscles.some((a) => other.muscles.some((b) => musclesOverlap(a, b)))).toBe(
              false,
            )
        }
      }
      const next = generateWeek({ ...data, weekStart: '2026-09-14', previous: plan })
      expect(next.days).toHaveLength(7)
    },
  )
  it('does not fill missing slots with unsuitable equipment or unreviewed moves', () => {
    const plan = generateWeek({
      ...input,
      profile: { ...profile, availableEquipment: ['Bodyweight'] },
    })
    const first = plan.days[0]
    expect(first.kind).toBe('training')
    if (first.kind !== 'training') throw new Error('expected training')
    expect(first.missingSlots?.join('')).toContain('拉类')
    for (const day of plan.days)
      if (day.kind === 'training')
        for (const p of day.prescriptions) {
          const exercise = exercises.find((e) => e.id === p.exerciseId)!
          expect(exercise.requiredEquipment).toEqual(['Bodyweight'])
          expect(exercise.difficulty).toBe('beginner')
          expect(exercise.reviewStatus).toBe('recommendation-reviewed')
        }
  })
  it('today recommendation obeys rest days and does not add missed volume', () => {
    const plan = generateWeek({ ...input, today: '2026-09-08' })
    expect(recommendMuscles(plan, '2026-09-08')).toMatchObject({
      muscles: [],
      day: { kind: 'rest' },
    })
    const wed = plan.days[2]
    expect(wed.kind === 'training' && wed.prescriptions.length).toBe(4)
  })
  it('honors actual recovery including broad Back versus Lats labels', () => {
    expect(musclesOverlap('Back', 'Lats')).toBe(true)
    const plan = generateWeek({ ...input, records: [actual('2026-09-06')] })
    const first = plan.days[0]
    expect(first.kind === 'training' && first.muscles).not.toContain('Chest')
    expect(first.kind === 'training' && first.missingSlots?.join('')).toContain('恢复')
    expect(generateWeek({ ...input, records: [actual('2026-09-05')] })).toEqual(generateWeek(input))
    expect(
      generateWeek({ ...input, records: [{ ...actual('2026-09-06'), profileId: 'other' }] }),
    ).toEqual(generateWeek(input))
  })
  it('protects completed and past plans when the profile changes, and never mutates history', () => {
    const existing = generateWeek(input)
    const friday = existing.days[4]
    if (friday.kind !== 'training') throw new Error('expected training')
    friday.status = 'completed'
    const records = [actual('2026-09-07')]
    const snapshot = structuredClone({ existing, records })
    const next = generateWeek({
      ...input,
      today: '2026-09-09',
      existing,
      records,
      profile: { ...profile, trainingDays: [2, 4, 6] },
    })
    expect(next.days[0]).toEqual(existing.days[0])
    expect(next.days[4]).toEqual(friday)
    expect({ existing, records }).toEqual(snapshot)
  })
  it('respects the previous Sunday when generating Monday across a week boundary', () => {
    const old = generateWeek(input)
    old.days[6] = {
      date: '2026-09-13',
      kind: 'training',
      muscles: ['Chest'],
      prescriptions: [],
      status: 'planned',
    }
    const next = generateWeek({ ...input, weekStart: '2026-09-14', previous: old })
    expect(next.days[0].kind === 'training' && next.days[0].muscles).not.toContain('Chest')
  })
})
describe('service integration', () => {
  it('uses repository history only when the caller supplies matching equipment context', async () => {
    const users = createMemoryUserRepository()
    const service = createServices({ users })
    await service.profile.save(profile)
    await users.saveRecord(actual('2026-09-04', 'machine-row'))
    const plan = await service.recommendations.generate('2026-09-07', {
      'machine-row': { equipmentKey: 'gym-A', availableWeightsKg: [15, 20, 22] },
    })
    const day = plan.days[0]
    if (day.kind !== 'training') throw new Error('expected training')
    expect(day.prescriptions.find((p) => p.exerciseId === 'machine-row')?.load).toMatchObject({
      status: 'suggested',
      value: { kind: 'external', kg: 20 },
      basedOnRecordIds: ['record'],
    })
  })
  it('shares one service instance per Pinia but isolates a separate app', async () => {
    setActivePinia(createPinia())
    const a = useServicesStore()
    expect(await a.get()).toBe(await useServicesStore().get())
    await (await a.get()).profile.save(profile)
    setActivePinia(createPinia())
    expect(await (await useServicesStore().get()).profile.get()).toBeNull()
  })
  it('validates profile before writing and stores plan edits without making records', async () => {
    const users = createMemoryUserRepository()
    const service = createServices({ users })
    await expect(service.profile.save({ ...profile, trainingDays: [1, 2, 3] })).rejects.toThrow()
    expect(await users.getProfile()).toBeNull()
    await service.profile.save(profile)
    const plan = await service.recommendations.generate('2026-09-07')
    const day = plan.days[0]
    if (day.kind !== 'training') throw new Error('expected training')
    const value = { ...day.prescriptions[0]!, sets: 4 }
    const changed = await service.recommendations.adjust(profile.id, day.date, value, '2026-09-07')
    expect(changed.days[0].kind === 'training' && changed.days[0].prescriptions[0]!.sets).toBe(4)
    expect(await users.listRecords(profile.id)).toEqual([])
    await expect(
      service.recommendations.adjust(profile.id, day.date, value, '2026-09-08'),
    ).rejects.toThrow()
    const broken = createServices({
      users: {
        ...users,
        savePlan: async () => {
          throw new Error('write failed')
        },
      },
    })
    await expect(broken.recommendations.generate('2026-09-07')).rejects.toThrow('write failed')
  })
})
