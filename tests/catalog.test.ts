import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { exercises as upstream } from '@bryllim/workout-guide'
import generated from '../src/data/exercises.generated.json'
import { parseCatalog } from '../src/utils/validate-catalog'
import { createStaticExerciseRepository } from '../src/repositories/static-exercise.repository'
import { createMemoryUserRepository } from '../src/repositories/memory-user.repository'
import { createExerciseService } from '../src/services/exercise.service'
import { createServices } from '../src/services/create-services'
import type { UserProfile } from '../src/types/profile'
import type { TrainingRecord, WeeklyPlan } from '../src/types/training'
import type { Exercise } from '../src/types/exercise'
import type { ExerciseRepository } from '../src/types/repository'
import { prepareCatalog, checkOutputs, root, sha256 } from '../scripts/catalog-lib.mts'
import provenance from '../src/data/catalog-source.json'

const catalog = parseCatalog(generated)
const get = (id: string) => {
  const exercise = catalog.find((item) => item.id === id)
  if (!exercise) throw new Error('Fixture not found: ' + id)
  return exercise
}
const service = createExerciseService(createStaticExerciseRepository())
const profile: UserProfile = {
  id: 'local',
  goal: 'muscle-gain',
  ability: 'beginner',
  availableEquipment: ['Bodyweight', 'Dumbbell'],
  trainingDays: [1, 3, 5],
}
function record(id = 'session-1', profileId = 'local'): TrainingRecord {
  return {
    id,
    profileId,
    exerciseId: 'goblet-squat',
    date: '2026-09-07',
    performedAt: '2026-09-07T10:00:00+08:00',
    equipmentKey: 'gym-dumbbell',
    sets: [
      {
        id: 'set-1',
        measurement: 'reps',
        reps: 10,
        load: { kind: 'external', kg: 8, basis: 'total' },
        remainingReps: 3,
        completed: true,
      },
    ],
    notes: '',
    status: 'completed',
  }
}

describe('catalog integration', () => {
  it('preserves all upstream IDs and per-frame attributions', () => {
    expect(catalog.map((item) => item.id)).toEqual(upstream.map((item) => item.slug))
    expect(catalog).toHaveLength(302)
    catalog.forEach((item, index) => {
      expect(item.upstreamId).toBe(upstream[index]!.id)
      expect(item.frames.map((frame) => frame.attribution)).toEqual(
        upstream[index]!.frames.map((frame) => frame.attribution),
      )
      expect(item.name).toMatch(/[\u3400-\u9fff]/)
    })
  })
  it('reproduces every generated file, original frame and license byte for byte', async () => {
    const { outputs } = await prepareCatalog()
    await checkOutputs(outputs)
    expect(provenance.frameCount).toBe(906)
    expect(Object.keys(provenance.assetsSha256)).toHaveLength(906)
    expect(provenance.totalImageBytes).toBe(30985307)
  })
  it('detects PNG corruption against recorded SHA-256', async () => {
    const bytes = await readFile(path.join(root, 'public/exercises/bench-press/1.png'))
    expect(sha256(bytes)).toBe(provenance.assetsSha256['exercises/bench-press/1.png'])
    bytes[30] = (bytes[30] ?? 0) ^ 255
    expect(sha256(bytes)).not.toBe(provenance.assetsSha256['exercises/bench-press/1.png'])
  })
  it('rejects duplicate IDs, missing frames, empty Chinese content and invalid equipment', () => {
    expect(() => parseCatalog([get('plank'), get('plank')])).toThrow('Duplicate')
    expect(() =>
      parseCatalog([{ ...get('plank'), frames: get('plank').frames.slice(0, 2) }]),
    ).toThrow()
    expect(() => parseCatalog([{ ...get('plank'), name: '  ' }])).toThrow()
    expect(() => parseCatalog([{ ...get('plank'), equipment: 'unknown' }])).toThrow()
  })
  it('rejects swapped frames and path traversal', () => {
    const item = structuredClone(get('plank'))
    const [a, b, c] = item.frames
    expect(() => parseCatalog([{ ...item, frames: [c, b, a] }])).toThrow()
    a.path = '../secret.png'
    expect(() => parseCatalog([item])).toThrow()
  })
  it('rejects an unreviewed or visually disputed recommendation candidate', () => {
    expect(() => parseCatalog([{ ...get('plank'), reviewStatus: 'catalog-reviewed' }])).toThrow()
    expect(() => parseCatalog([{ ...get('plank'), illustrationNotes: ['需要核对'] }])).toThrow()
  })
  it('keeps timed and distance exercises distinct from repetitions', () => {
    expect(get('plank').measurement).toBe('duration')
    expect(get('running').measurement).toBe('distance-duration')
    expect(get('push-up').measurement).toBe('reps')
    expect(get('cable-pallof-hold').measurement).toBe('duration')
    expect(get('cable-pallof-hold').load.kind).toBe('external')
    expect(get('farmer-carry').measurement).toBe('distance-duration')
    expect(get('farmer-carry').load).toMatchObject({ kind: 'external', basis: 'per-hand' })
  })
  it('uses assistance, per-hand, single-implement and barbell load conventions correctly', () => {
    expect(get('assisted-pull-up').load.kind).toBe('assistance')
    expect(get('dumbbell-bench-press').load).toMatchObject({ kind: 'external', basis: 'per-hand' })
    for (const id of ['goblet-squat', 'weighted-russian-twist', 'single-dumbbell-skullcrusher']) {
      expect(get(id).load).toMatchObject({ kind: 'external', basis: 'total' })
    }
    expect(get('dumbbell-sumo-deadlift').load).toMatchObject({
      kind: 'external',
      basis: 'per-hand',
    })
    expect(get('bench-press').load.label).toContain('含杆')
    expect(get('banded-row').load.kind).toBe('band')
    expect(get('weighted-pull-up').load.label).toContain('额外')
  })
  it('adds the supporting equipment needed for recommendation candidates', () => {
    expect(get('bench-press').requiredEquipment).toEqual(
      expect.arrayContaining(['Barbell', 'Bench', 'Rack']),
    )
    expect(get('pull-up').requiredEquipment).toContain('Pull-up Bar')
    expect(get('hip-thrust').requiredEquipment).toContain('Bench')
  })
})

describe('search and service boundary', () => {
  it.each([
    ['俯卧撑', 'push-up'],
    ['PUSH-UP', 'push-up'],
    ['  ＰＵＳＨ　ＵＰ  ', 'push-up'],
    ['胸部', 'bench-press'],
    ['三头', 'bench-press'],
    ['哑铃 胸部', 'dumbbell-bench-press'],
    ['二头弯举', 'bicep-curl'],
  ])('finds %s', async (query, id) => {
    expect((await service.search({ query })).map((item) => item.id)).toContain(id)
  })
  it('combines filters with AND and searches secondary muscles', async () => {
    const results = await service.search({
      query: '卧推',
      equipment: 'Dumbbell',
      muscle: 'Triceps',
    })
    expect(results.length).toBeGreaterThan(0)
    expect(
      results.every(
        (item) => item.equipment === 'Dumbbell' && item.secondaryMuscles.includes('Triceps'),
      ),
    ).toBe(true)
    expect(await service.search({ query: '不存在的动作xyz' })).toEqual([])
    expect(await service.search({ query: '  ' })).toHaveLength(302)
  })
  it('returns null for unknown IDs including prototype property names', async () => {
    expect(await service.getById('missing')).toBeNull()
    expect(await service.getById('__proto__')).toBeNull()
    expect(await service.getFrameUrls('missing')).toBeNull()
  })
  it.each(['/', '/fitness-atlas/', '/fitness-atlas'])(
    'builds same-origin image URLs under %s',
    async (baseUrl) => {
      const scoped = createExerciseService(createStaticExerciseRepository(), baseUrl)
      const prefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
      expect(await scoped.getFrameUrls('plank')).toEqual(
        [1, 2, 3].map((n) => prefix + 'exercises/plank/' + n + '.png'),
      )
    },
  )
  it('only returns explicitly reviewed candidates', async () => {
    const results = await service.search({ recommendationOnly: true })
    expect(results.length).toBeGreaterThan(0)
    expect(
      results.every(
        (item) => item.reviewStatus === 'recommendation-reviewed' && !item.illustrationNotes.length,
      ),
    ).toBe(true)
    expect(results.map((item) => item.id)).not.toContain('lat-pulldown')
  })
  it('does not expose mutable static catalog objects', async () => {
    const found = await service.getById('plank')
    found!.steps[0] = 'mutated'
    expect((await service.getById('plank'))!.steps[0]).not.toBe('mutated')
  })
  it('accepts a replacement repository and propagates failures', async () => {
    const stub: ExerciseRepository = {
      async list() {
        return [structuredClone(get('plank'))]
      },
      async findById() {
        throw new Error('data unavailable')
      },
    }
    const injected = createServices({ exercises: stub })
    expect(await injected.exercises.search()).toHaveLength(1)
    await expect(injected.exercises.getById('plank')).rejects.toThrow('data unavailable')
  })
})

describe('memory repository', () => {
  it('starts empty and isolates separate application instances', async () => {
    const a = createServices()
    const b = createServices()
    expect(await a.profile.get()).toBeNull()
    await a.profile.save(profile)
    expect(await b.profile.get()).toBeNull()
  })
  it('clones profile input and output', async () => {
    const repo = createMemoryUserRepository()
    const value = structuredClone(profile)
    await repo.saveProfile(value)
    value.trainingDays.push(7)
    const saved = (await repo.getProfile())!
    expect(saved.trainingDays).toEqual([1, 3, 5])
    saved.trainingDays.push(6)
    expect((await repo.getProfile())!.trainingDays).toEqual([1, 3, 5])
  })
  it('upserts record IDs, filters profiles and prevents mutation leaks', async () => {
    const repo = createMemoryUserRepository()
    const value = record()
    await repo.saveRecord(value)
    value.notes = 'second save'
    await repo.saveRecord(value)
    await repo.saveRecord(record('other', 'other-profile'))
    value.notes = 'not saved'
    const results = await repo.listRecords('local')
    expect(results).toHaveLength(1)
    expect(results[0]!.notes).toBe('second save')
    results[0]!.notes = 'mutated'
    expect((await repo.listRecords('local'))[0]!.notes).toBe('second save')
  })
  it('keys plans by both profile and week and copies nested days', async () => {
    const repo = createMemoryUserRepository()
    const day = (n: number) => ({
      date: '2026-09-' + String(n).padStart(2, '0'),
      kind: 'rest' as const,
      reason: '休息',
    })
    const plan: WeeklyPlan = {
      id: 'week-1',
      profileId: 'local',
      weekStart: '2026-09-07',
      ruleVersion: 'v1',
      days: [day(7), day(8), day(9), day(10), day(11), day(12), day(13)],
    }
    await repo.savePlan(plan)
    plan.days[0] = day(20)
    expect((await repo.getPlan('local', '2026-09-07'))!.days[0].date).toBe('2026-09-07')
    expect(await repo.getPlan('other', '2026-09-07')).toBeNull()
    expect(await repo.getPlan('local', '2026-09-14')).toBeNull()
  })
})

// These declarations are checked by tsconfig.tools.json as well as the runtime suite.
type TimedSet = Extract<TrainingRecord['sets'][number], { measurement: 'duration' }>
const validTimed: TimedSet = {
  id: 'timed',
  measurement: 'duration',
  seconds: 30,
  remainingReps: null,
  load: { kind: 'bodyweight' },
  completed: true,
}
const invalidTimed: TimedSet = {
  id: 'bad',
  measurement: 'duration',
  // @ts-expect-error A timed set must not use reps in place of seconds.
  reps: 12,
  remainingReps: null,
  load: { kind: 'bodyweight' },
  completed: true,
}
// @ts-expect-error Three-frame tuple must contain exactly three entries.
const invalidFrames: Exercise['frames'] = [get('plank').frames[0], get('plank').frames[1]]
void validTimed
void invalidTimed
void invalidFrames
