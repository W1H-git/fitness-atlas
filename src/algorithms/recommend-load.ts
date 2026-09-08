import type { Exercise } from '../types/exercise'
import type { LoadSuggestion, TrainingRecord, TrainingSet } from '../types/training'
import { isLocalDate } from '../utils/local-date'

export interface LoadContext {
  equipmentKey: string
  availableWeightsKg: number[]
}
export interface LoadTarget {
  sets: number
  measurement: Exercise['measurement']
  min: number
  max: number
}

export function recommendLoad(
  exercise: Exercise,
  target: LoadTarget,
  history: readonly TrainingRecord[],
  asOfDate: string,
  context?: LoadContext,
): LoadSuggestion {
  const calibration = (reason: string): LoadSuggestion => ({
    status: 'needs-calibration',
    convention: exercise.load,
    reason,
  })
  const simple = (kind: 'bodyweight' | 'none', reason: string): LoadSuggestion => ({
    status: 'suggested',
    value: { kind },
    reason,
    basedOnRecordIds: [],
  })
  if (exercise.load.kind === 'bodyweight')
    return simple('bodyweight', '使用自重版本；先保持动作可控，不自动增加外加负重。')
  if (exercise.load.kind === 'none') return simple('none', '本动作不按公斤推荐负重。')
  if (exercise.load.kind === 'band')
    return calibration('选择能控制全程的弹力带型号或阻力等级，不换算公斤。')
  if (!isLocalDate(asOfDate)) throw new Error('推荐参考日期无效')
  if (!context?.equipmentKey.trim())
    return calibration('待试重：选择完成目标后仍能再做约2–3次的重量；先确认器械与计量口径。')
  if (context.availableWeightsKg.some((weight) => !Number.isFinite(weight) || weight < 0))
    return calibration('器械重量档位无效，请重新确认。')
  const latestByDate = new Map<string, TrainingRecord>()
  const usedIds = new Set<string>()
  const ordered = history
    .filter(
      (record) =>
        record.exerciseId === exercise.id &&
        record.equipmentKey === context.equipmentKey &&
        record.status === 'completed' &&
        isLocalDate(record.date) &&
        record.date < asOfDate &&
        Number.isFinite(Date.parse(record.performedAt)),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        Date.parse(b.performedAt) - Date.parse(a.performedAt) ||
        a.id.localeCompare(b.id),
    )
  for (const record of ordered) {
    if (!usedIds.has(record.id) && !latestByDate.has(record.date))
      latestByDate.set(record.date, record)
    usedIds.add(record.id)
  }
  const records = [...latestByDate.values()]
  const latest = records[0]
  if (!latest?.sets.length)
    return calibration('待试重：没有同动作、同器械的已完成工作组记录，不按等级猜测公斤数。')
  const load = exercise.load
  const valid = (set: TrainingSet): boolean =>
    set.completed &&
    set.measurement === target.measurement &&
    (set.load.kind === 'external' || set.load.kind === 'assistance') &&
    set.load.kind === load.kind &&
    set.load.basis === load.basis &&
    Number.isFinite(set.load.kg) &&
    (load.kind === 'assistance' ? set.load.kg >= 0 : set.load.kg > 0) &&
    (set.measurement === 'reps'
      ? Number.isInteger(set.reps) && set.reps > 0
      : Number.isFinite(set.seconds) && set.seconds > 0) &&
    (set.remainingReps === null || (Number.isFinite(set.remainingReps) && set.remainingReps >= 0))
  if (!latest.sets.every(valid))
    return calibration('最近记录的完成状态、计量口径或数值不完整，请先确认工作重量。')
  const firstLoad = latest.sets[0]!.load
  if (firstLoad.kind !== 'external' && firstLoad.kind !== 'assistance')
    return calibration('记录的负重口径不匹配。')
  const current = firstLoad.kg
  const uniform = (record: TrainingRecord) =>
    record.sets.every(
      (set) =>
        valid(set) &&
        (set.load.kind === 'external' || set.load.kind === 'assistance') &&
        set.load.kg === current,
    )
  if (!uniform(latest))
    return calibration('最近各组重量不一致，请确认本次工作重量后再使用渐进建议。')
  const suggest = (kg: number, reason: string, ids = [latest.id]): LoadSuggestion => ({
    status: 'suggested',
    value: { ...firstLoad, kg },
    reason,
    basedOnRecordIds: ids,
  })
  if (target.measurement !== 'reps')
    return suggest(current, '沿用同器械最近工作重量；计时动作不套用次数加重规则。')
  const weights = [...new Set(context.availableWeightsKg)]
    .filter((weight) => load.kind === 'assistance' || weight > 0)
    .sort((a, b) => a - b)
  const underTarget = latest.sets.some((set) => set.measurement === 'reps' && set.reps < target.min)
  const easier =
    load.kind === 'assistance'
      ? weights.find((weight) => weight > current)
      : weights.filter((weight) => weight < current).at(-1)
  if (underTarget)
    return easier === undefined
      ? suggest(current, '未达到次数下限，但没有更轻松的已知档位；先调整动作或确认器械。')
      : suggest(
          easier,
          load.kind === 'assistance'
            ? '未达次数下限，增加一个辅助档位以降低难度。'
            : '未达次数下限，降低一个可用重量档位。',
        )
  const successful = (record: TrainingRecord) =>
    uniform(record) &&
    record.sets.length >= target.sets &&
    record.sets.every(
      (set) =>
        set.measurement === 'reps' &&
        set.reps >= target.max &&
        set.remainingReps !== null &&
        set.remainingReps >= 2,
    )
  const previous = records[1]
  if (!previous || !successful(latest) || !successful(previous))
    return suggest(current, '沿用最近工作重量；尚未满足连续两次达到上限并保留至少2次能力的条件。')
  const harder =
    load.kind === 'assistance'
      ? weights.filter((weight) => weight < current).at(-1)
      : weights.find((weight) => weight > current)
  if (harder === undefined || current === 0)
    return suggest(current, '已满足进阶条件，但没有更高难度的已知档位，暂时保持。')
  if (Math.abs(harder - current) / current > 0.100000001)
    return suggest(current, '下一档难度变化超过当前重量的10%，本次保持并寻找更小档位。')
  return suggest(
    harder,
    load.kind === 'assistance'
      ? '连续两次达标，减少一个辅助档位；辅助越少，难度越高。'
      : '连续两次达标，增加一个可用重量档位，增幅不超过10%。',
    [latest.id, previous.id],
  )
}
