import { z } from 'zod'
import type { BackupData, TrainingDraft } from '../types/local-data'
import { trainingId } from '../types/local-data'
import type { Exercise } from '../types/exercise'
import { muscleLabels } from '../types/exercise'
import type { TrainingRecord, WeeklyPlan } from '../types/training'
import { parseProfile } from './validate-profile'
import { addDays, isLocalDate, weekStart } from './local-date'
import { validatePrescription } from './validate-prescription'
const text = z.string().max(2000)
const id = z.string().min(1).max(500)
const date = z.string().refine(isLocalDate, '日期无效')
const nonnegative = z.number().finite().min(0).max(100000)
const integer = z.number().int().min(0).max(100000)
const basis = z.enum(['per-hand', 'total', 'machine-stack'])
const load = z.union([
  z.object({ kind: z.enum(['bodyweight', 'none']) }),
  z.object({ kind: z.enum(['external', 'assistance']), kg: nonnegative.max(1000), basis }),
  z.object({ kind: z.literal('band'), resistanceLabel: z.string().trim().min(1).max(100) }),
])
const convention = z.union([
  z.object({ kind: z.enum(['bodyweight', 'band', 'none']), label: text }),
  z.object({ kind: z.enum(['external', 'assistance']), unit: z.literal('kg'), basis, label: text }),
])
const suggestion = z.union([
  z.object({ status: z.literal('needs-calibration'), convention, reason: text }),
  z.object({
    status: z.literal('suggested'),
    value: load,
    reason: text,
    basedOnRecordIds: z.array(id).max(100),
  }),
])
const base = {
  exerciseId: id,
  sets: z.number().int().min(1).max(10),
  restSeconds: integer,
  load: suggestion,
  reason: text,
}
const interval = z.object({ min: integer, max: integer })
const prescription = z.discriminatedUnion('measurement', [
  z.object({ ...base, measurement: z.literal('reps'), reps: interval }),
  z.object({ ...base, measurement: z.literal('duration'), seconds: interval }),
  z.object({
    ...base,
    measurement: z.literal('distance-duration'),
    seconds: integer,
    meters: nonnegative.nullable(),
  }),
])
const setBase = {
  id,
  load,
  remainingReps: z.number().finite().min(0).max(100).nullable(),
  completed: z.boolean(),
}
const set = z.discriminatedUnion('measurement', [
  z.object({ ...setBase, measurement: z.literal('reps'), reps: integer }),
  z.object({ ...setBase, measurement: z.literal('duration'), seconds: integer }),
  z.object({
    ...setBase,
    measurement: z.literal('distance-duration'),
    seconds: integer,
    meters: nonnegative,
  }),
])
const recordSchema = z.object({
  id,
  profileId: id,
  exerciseId: id,
  date,
  performedAt: z.iso.datetime({ offset: true }),
  equipmentKey: id,
  availableWeightsKg: z.array(nonnegative.max(1000)).max(200).optional(),
  sets: z.array(set).min(1).max(10),
  notes: text,
  status: z.enum(['draft', 'completed']),
})
const input = z.preprocess(
  (value) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : value),
  z.string().max(128),
)
const draftSchema = z.object({
  id,
  profileId: id,
  exerciseId: id,
  date,
  equipmentKey: z.string().max(500),
  availableWeights: z.string().max(2000),
  notes: text,
  rows: z
    .array(
      z.object({
        id,
        reps: input,
        seconds: input,
        meters: input,
        kg: input,
        resistanceLabel: input,
        remainingReps: input,
        completed: z.boolean(),
      }),
    )
    .min(1)
    .max(10),
})
const day = z.discriminatedUnion('kind', [
  z.object({ date, kind: z.literal('rest'), reason: text }),
  z.object({
    date,
    kind: z.literal('training'),
    label: text.optional(),
    missingSlots: z.array(text).max(20).optional(),
    warnings: z.array(text).max(20).optional(),
    muscles: z
      .array(
        z.enum(
          Object.keys(muscleLabels) as [
            keyof typeof muscleLabels,
            ...(keyof typeof muscleLabels)[],
          ],
        ),
      )
      .max(30),
    prescriptions: z.array(prescription).max(20),
    status: z.enum(['planned', 'completed', 'skipped']),
  }),
])
const planSchema = z.object({
  id,
  profileId: id,
  weekStart: date,
  ruleVersion: id,
  profileSignature: z.string().max(10000).optional(),
  days: z.array(day).length(7),
})
function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new Error(label + '存在重复项')
}
export function validateDraft(value: unknown, exercises: readonly Exercise[]): TrainingDraft {
  const draft = draftSchema.parse(value)
  if (
    !exercises.some((e) => e.id === draft.exerciseId) ||
    draft.id !== trainingId(draft.profileId, draft.date, draft.exerciseId)
  )
    throw new Error('草稿动作或标识无效')
  unique(
    draft.rows.map((row) => row.id),
    '训练组',
  )
  return draft
}
export function validateRecord(value: unknown, exercises: readonly Exercise[]): TrainingRecord {
  const record = recordSchema.parse(value)
  const exercise = exercises.find((item) => item.id === record.exerciseId)
  if (!exercise || record.id !== trainingId(record.profileId, record.date, record.exerciseId))
    throw new Error('训练动作或标识无效')
  unique(
    record.sets.map((item) => item.id),
    '训练组',
  )
  if (record.status !== 'completed') throw new Error('未完成内容应保存为草稿')
  for (const item of record.sets) {
    if (
      !item.completed ||
      item.measurement !== exercise.measurement ||
      item.load.kind !== exercise.load.kind
    )
      throw new Error('训练组的状态或计量方式无效')
    if (item.measurement === 'reps' ? item.reps < 1 : item.seconds < 1)
      throw new Error('实际次数或时长必须大于零')
    if (item.load.kind === 'external' || item.load.kind === 'assistance') {
      if (
        (exercise.load.kind !== 'external' && exercise.load.kind !== 'assistance') ||
        item.load.basis !== exercise.load.basis ||
        (item.load.kind === 'external' && item.load.kg === 0)
      )
        throw new Error('重量计量口径无效')
    }
  }
  return record
}
export function validateBackup(value: unknown, exercises: readonly Exercise[]): BackupData {
  const envelope = z
    .object({
      version: z.literal(1),
      exportedAt: z.iso.datetime({ offset: true }),
      profile: z.unknown(),
      plans: z.array(z.unknown()).max(5000),
      records: z.array(z.unknown()).max(20000),
      drafts: z.array(z.unknown()).max(2000),
    })
    .parse(value)
  const profile = envelope.profile === null ? null : parseProfile(envelope.profile)
  const records = envelope.records.map((item) => validateRecord(item, exercises))
  const drafts = envelope.drafts.map((item) => validateDraft(item, exercises))
  const plans = envelope.plans.map((item) => {
    const plan = planSchema.parse(item) as WeeklyPlan
    if (weekStart(plan.weekStart) !== plan.weekStart) throw new Error('周计划起始日期不是周一')
    for (const [index, d] of plan.days.entries()) {
      if (d.date !== addDays(plan.weekStart, index)) throw new Error('日程日期不连续')
      if (d.kind === 'training') {
        unique(
          d.prescriptions.map((p) => p.exerciseId),
          '日程动作',
        )
        for (const p of d.prescriptions) {
          const exercise = exercises.find((e) => e.id === p.exerciseId)
          if (!exercise) throw new Error('日程引用了不存在的动作')
          validatePrescription(p, exercise)
        }
      }
    }
    return plan
  })
  if ([...records, ...drafts, ...plans].some((item) => item.profileId !== profile?.id))
    throw new Error('备份包含不属于当前档案的数据')
  unique(
    records.map((r) => r.id),
    '记录',
  )
  unique(
    drafts.map((d) => d.id),
    '草稿',
  )
  unique(
    plans.map((p) => p.profileId + ':' + p.weekStart),
    '周计划',
  )
  if (drafts.some((d) => records.some((r) => r.id === d.id)))
    throw new Error('已完成记录不能同时存在同名草稿')
  return { version: 1, exportedAt: envelope.exportedAt, profile, records, drafts, plans }
}
