import { describe, expect, it } from 'vitest'
import generated from '../src/data/exercises.generated.json'
import { parseCatalog } from '../src/utils/validate-catalog'
import { prescribeExercise } from '../src/algorithms/prescribe-exercise'
import { recommendLoad } from '../src/algorithms/recommend-load'
import { validatePrescription } from '../src/utils/validate-prescription'
import type { UserProfile } from '../src/types/profile'
import type { TrainingRecord, LoadSuggestion } from '../src/types/training'

const catalog = parseCatalog(generated)
const get = (id: string) => catalog.find((exercise) => exercise.id === id)!
const profile: UserProfile = {
  id: 'local',
  goal: 'muscle-gain',
  ability: 'beginner',
  availableEquipment: ['Bodyweight', 'Dumbbell'],
  trainingDays: [1, 3, 5],
}
const target = { sets: 2, measurement: 'reps' as const, min: 8, max: 12 }
const context = { equipmentKey: 'gym-A', availableWeightsKg: [15, 20, 22, 25] }
function record(
  id: string,
  date: string,
  options: { kg?: number; reps?: number; rir?: number | null; assistance?: boolean } = {},
): TrainingRecord {
  return {
    id,
    profileId: 'local',
    exerciseId: options.assistance ? 'assisted-pull-up' : 'goblet-squat',
    date,
    performedAt: date + 'T10:00:00+08:00',
    equipmentKey: 'gym-A',
    status: 'completed',
    notes: '',
    sets: [1, 2].map((index) => ({
      id: String(index),
      measurement: 'reps',
      reps: options.reps ?? 12,
      remainingReps: options.rir === undefined ? 2 : options.rir,
      completed: true,
      load: {
        kind: options.assistance ? 'assistance' : 'external',
        kg: options.kg ?? 20,
        basis: options.assistance ? 'machine-stack' : 'total',
      },
    })),
  }
}
const history = [record('first', '2026-09-01'), record('second', '2026-09-04')]
function kg(result: LoadSuggestion) {
  return result.status === 'suggested' &&
    (result.value.kind === 'external' || result.value.kind === 'assistance')
    ? result.value.kg
    : null
}
describe('prescriptions', () => {
  it.each([
    ['muscle-gain', 'beginner', 2],
    ['muscle-gain', 'intermediate', 3],
    ['muscle-gain', 'advanced', 3],
    ['fat-loss', 'beginner', 2],
    ['fat-loss', 'intermediate', 2],
    ['fat-loss', 'advanced', 3],
  ] as const)('%s / %s uses a transparent starting dose', (goal, ability, sets) => {
    const result = prescribeExercise(
      get('goblet-squat'),
      { ...profile, goal, ability },
      [],
      '2026-09-07',
    )
    expect(result).toMatchObject({
      sets,
      measurement: 'reps',
      reps: { min: 8, max: 12 },
      restSeconds: 120,
      load: { status: 'needs-calibration' },
    })
  })
  it('keeps duration separate and bodyweight free of imaginary kilograms', () => {
    const result = prescribeExercise(get('plank'), profile, [], '2026-09-07')
    expect(result).toMatchObject({
      measurement: 'duration',
      seconds: { min: 20, max: 30 },
      restSeconds: 90,
      load: { value: { kind: 'bodyweight' } },
    })
    expect(result).not.toHaveProperty('reps')
    expect(recommendLoad(get('banded-row'), target, [], '2026-09-07')).toMatchObject({
      status: 'needs-calibration',
    })
  })
  it('rejects incorrect ranges, invalid numbers and load conventions in manual edits', () => {
    const base = prescribeExercise(get('goblet-squat'), profile, [], '2026-09-07')
    expect(() => validatePrescription({ ...base, sets: NaN }, get('goblet-squat'))).toThrow()
    expect(() =>
      validatePrescription(
        { ...base, measurement: 'reps', reps: { min: 12, max: 8 } },
        get('goblet-squat'),
      ),
    ).toThrow()
    expect(() =>
      validatePrescription(
        {
          ...base,
          load: {
            status: 'suggested',
            value: { kind: 'external', kg: 20, basis: 'per-hand' },
            reason: '',
            basedOnRecordIds: [],
          },
        },
        get('goblet-squat'),
      ),
    ).toThrow()
    expect(() => validatePrescription(base, get('plank'))).toThrow()
  })
})
describe('load history', () => {
  it('needs matching equipment and does not borrow another profile history', () => {
    expect(kg(recommendLoad(get('goblet-squat'), target, history, '2026-09-07'))).toBeNull()
    expect(
      kg(
        recommendLoad(get('goblet-squat'), target, history, '2026-09-07', {
          ...context,
          equipmentKey: 'other',
        }),
      ),
    ).toBeNull()
    const result = prescribeExercise(
      get('goblet-squat'),
      { ...profile, id: 'other' },
      history,
      '2026-09-07',
      context,
    )
    expect(result.load.status).toBe('needs-calibration')
  })
  it('increases one known step after two completed qualifying sessions and cites both', () => {
    const result = recommendLoad(get('goblet-squat'), target, history, '2026-09-07', context)
    expect(kg(result)).toBe(22)
    expect(result).toMatchObject({ basedOnRecordIds: ['second', 'first'] })
    expect(history[0]!.sets[0]!.load).toMatchObject({ kg: 20 })
  })
  it.each([1, null])('keeps load when remaining reps is %s', (rir) => {
    const data = [history[0]!, record('latest', '2026-09-04', { rir })]
    expect(kg(recommendLoad(get('goblet-squat'), target, data, '2026-09-07', context))).toBe(20)
  })
  it('does not increase for a single day, duplicate IDs, insufficient sets or changed work weight', () => {
    const duplicate = { ...history[1]!, id: 'same-day' }
    expect(
      kg(
        recommendLoad(get('goblet-squat'), target, [history[1]!, duplicate], '2026-09-07', context),
      ),
    ).toBe(20)
    expect(
      kg(
        recommendLoad(
          get('goblet-squat'),
          target,
          [history[1]!, { ...history[0]!, id: 'second' }],
          '2026-09-07',
          context,
        ),
      ),
    ).toBe(20)
    const short = structuredClone(history)
    short[1]!.sets.pop()
    expect(kg(recommendLoad(get('goblet-squat'), target, short, '2026-09-07', context))).toBe(20)
    expect(
      kg(
        recommendLoad(
          get('goblet-squat'),
          target,
          [record('a', '2026-09-01', { kg: 15 }), history[1]!],
          '2026-09-07',
          context,
        ),
      ),
    ).toBe(20)
  })
  it('keeps weight if next increment exceeds 10% or no known increment exists', () => {
    expect(
      kg(
        recommendLoad(get('goblet-squat'), target, history, '2026-09-07', {
          ...context,
          availableWeightsKg: [20, 25],
        }),
      ),
    ).toBe(20)
    expect(
      kg(
        recommendLoad(get('goblet-squat'), target, history, '2026-09-07', {
          ...context,
          availableWeightsKg: [],
        }),
      ),
    ).toBe(20)
  })
  it('reduces a step below target and does not use future or unfinished sessions', () => {
    const low = record('low', '2026-09-04', { reps: 7 })
    expect(kg(recommendLoad(get('goblet-squat'), target, [low], '2026-09-07', context))).toBe(15)
    expect(
      kg(
        recommendLoad(
          get('goblet-squat'),
          target,
          [record('future', '2026-09-08'), { ...low, status: 'draft' }],
          '2026-09-07',
          context,
        ),
      ),
    ).toBeNull()
  })
  it('treats unknown RIR conservatively and rejects malformed or mixed loads', () => {
    for (const kind of ['unfinished', 'basis', 'nan', 'mixed'] as const) {
      const data = structuredClone(history)
      const set = data[1]!.sets[0]!
      if (kind === 'unfinished') set.completed = false
      else
        set.load = {
          kind: 'external',
          kg: kind === 'nan' ? NaN : kind === 'mixed' ? 15 : 20,
          basis: kind === 'basis' ? 'per-hand' : 'total',
        }
      expect(kg(recommendLoad(get('goblet-squat'), target, data, '2026-09-07', context))).toBeNull()
    }
  })
  it('reverses assistance progression, supports zero assistance and eases failed sets', () => {
    const data = [
      record('a', '2026-09-01', { assistance: true }),
      record('b', '2026-09-04', { assistance: true }),
    ]
    const assisted = { ...context, availableWeightsKg: [0, 18, 20, 22] }
    expect(kg(recommendLoad(get('assisted-pull-up'), target, data, '2026-09-07', assisted))).toBe(
      18,
    )
    expect(
      kg(
        recommendLoad(
          get('assisted-pull-up'),
          target,
          [record('low', '2026-09-04', { assistance: true, reps: 7 })],
          '2026-09-07',
          assisted,
        ),
      ),
    ).toBe(22)
    expect(
      kg(
        recommendLoad(
          get('assisted-pull-up'),
          target,
          [record('zero', '2026-09-04', { assistance: true, kg: 0 })],
          '2026-09-07',
          assisted,
        ),
      ),
    ).toBe(0)
  })
})
