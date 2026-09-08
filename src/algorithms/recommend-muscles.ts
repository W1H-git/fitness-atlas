import type { Exercise, Muscle } from '../types/exercise'
import type { PlanDay, TrainingRecord, WeeklyPlan } from '../types/training'
import { muscleRegions } from '../data/muscle-map'
import { daysBetween, isLocalDate } from '../utils/local-date'

export function musclesOverlap(a: Muscle, b: Muscle): boolean {
  return a === b || muscleRegions[a].some((region) => muscleRegions[b].includes(region))
}
export function recentMuscles(
  records: readonly TrainingRecord[],
  exercises: readonly Exercise[],
  date: string,
  today: string,
): Muscle[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  return [
    ...new Set(
      records
        .filter(
          (record) =>
            record.status === 'completed' &&
            isLocalDate(record.date) &&
            record.date <= today &&
            daysBetween(record.date, date) >= 0 &&
            daysBetween(record.date, date) < 2 &&
            record.sets.some(
              (set) =>
                set.completed && (set.measurement === 'reps' ? set.reps > 0 : set.seconds > 0),
            ),
        )
        .flatMap((record) => {
          const exercise = byId.get(record.exerciseId)
          return exercise ? [exercise.primaryMuscle] : []
        }),
    ),
  ]
}
export function recommendMuscles(
  plan: WeeklyPlan,
  date: string,
): { day: PlanDay | null; muscles: Muscle[]; reason: string } {
  const day = plan.days.find((item) => item.date === date) ?? null
  if (!day) return { day: null, muscles: [], reason: '当前计划不包含这个日期，请生成对应周计划。' }
  if (day.kind === 'rest') return { day, muscles: [], reason: day.reason }
  return {
    day,
    muscles: day.muscles,
    reason: day.prescriptions.length
      ? '依据本周训练日与恢复间隔安排，不自动补上已经过去的训练。'
      : '当前没有符合器械、能力和恢复条件的动作，请休息或调整档案。',
  }
}
