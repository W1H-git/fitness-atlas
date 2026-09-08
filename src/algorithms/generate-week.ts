import type { Exercise, Muscle } from '../types/exercise'
import type { UserProfile } from '../types/profile'
import type { PlanDay, TrainingRecord, WeeklyPlan } from '../types/training'
import { trainingTemplates } from '../data/training-templates'
import { abilityRank, patternLabels, RULE_VERSION } from '../data/recommendation-rules'
import {
  addDays,
  daysBetween,
  isLocalDate,
  weekday,
  weekStart as monday,
} from '../utils/local-date'
import { parseProfile } from '../utils/validate-profile'
import { musclesOverlap, recentMuscles } from './recommend-muscles'
import { prescribeExercise } from './prescribe-exercise'
import type { LoadContext } from './recommend-load'

export interface WeekInput {
  profile: UserProfile
  exercises: readonly Exercise[]
  records: readonly TrainingRecord[]
  weekStart: string
  today: string
  existing?: WeeklyPlan | null
  previous?: WeeklyPlan | null
  loadContexts?: Record<string, LoadContext>
}
export function generateWeek(input: WeekInput): WeeklyPlan {
  const profile = parseProfile(input.profile)
  if (!isLocalDate(input.today) || monday(input.weekStart) !== input.weekStart)
    throw new Error('请使用有效的周一日期')
  const template = trainingTemplates[profile.ability]
  const records = input.records.filter((record) => record.profileId === profile.id)
  const eligible = input.exercises
    .filter(
      (exercise) =>
        exercise.recommendationEligible &&
        exercise.reviewStatus === 'recommendation-reviewed' &&
        !exercise.illustrationNotes.length &&
        !exercise.isStretch &&
        abilityRank[exercise.difficulty] <= abilityRank[profile.ability] &&
        exercise.requiredEquipment.every((equipment) =>
          profile.availableEquipment.includes(equipment),
        ),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
  const days: PlanDay[] = []
  const earlier = input.previous?.profileId === profile.id ? input.previous.days : []
  const existing =
    input.existing?.profileId === profile.id && input.existing.weekStart === input.weekStart
      ? input.existing
      : null
  const usage = new Map<string, number>()
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(input.weekStart, offset)
    const slotIndex = profile.trainingDays.indexOf(weekday(date))
    const old = existing?.days.find((day) => day.date === date)
    if (old && (date < input.today || (old.kind === 'training' && old.status === 'completed'))) {
      days.push(structuredClone(old))
      continue
    }
    if (slotIndex === -1) {
      days.push({
        date,
        kind: 'rest',
        reason: '今天是计划休息日，给身体恢复时间；不自动安排补课。',
      })
      continue
    }
    const session = template.sessions[slotIndex]!
    const historicalBlocked = recentMuscles(records, input.exercises, date, input.today)
    const plannedBlocked = [...earlier, ...days]
      .filter(
        (day) =>
          day.kind === 'training' &&
          day.date >= input.today &&
          daysBetween(day.date, date) > 0 &&
          daysBetween(day.date, date) < 2,
      )
      .flatMap((day) => (day.kind === 'training' ? day.muscles : []))
    const blocked = [...historicalBlocked, ...plannedBlocked]
    const used = new Set<string>()
    const chosen: Exercise[] = []
    const missing: string[] = []
    for (const pattern of session.slots) {
      const candidates = eligible
        .filter((exercise) => exercise.pattern === pattern && !used.has(exercise.id))
        .sort(
          (a, b) =>
            (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0) ||
            abilityRank[b.difficulty] - abilityRank[a.difficulty] ||
            a.id.localeCompare(b.id),
        )
      const candidate = candidates.find(
        (exercise) => !blocked.some((muscle) => musclesOverlap(muscle, exercise.primaryMuscle)),
      )
      if (!candidate) {
        missing.push(
          patternLabels[pattern] +
            (candidates.length
              ? '：主要肌群仍在恢复窗口内'
              : '：没有符合当前器械和能力的已核对动作'),
        )
        continue
      }
      used.add(candidate.id)
      usage.set(candidate.id, (usage.get(candidate.id) ?? 0) + 1)
      chosen.push(candidate)
    }
    days.push({
      date,
      kind: 'training',
      label: session.label,
      status: 'planned',
      muscles: [...new Set(chosen.map((exercise) => exercise.primaryMuscle))] as Muscle[],
      prescriptions: chosen.map((exercise) =>
        prescribeExercise(
          exercise,
          profile,
          records,
          date < input.today ? date : input.today,
          input.loadContexts?.[exercise.id],
        ),
      ),
      missingSlots: missing,
      warnings: historicalBlocked.length ? ['已根据近期实际训练记录避开恢复中的主要肌群。'] : [],
    })
  }
  return {
    id: profile.id + ':' + input.weekStart,
    profileId: profile.id,
    weekStart: input.weekStart,
    ruleVersion: RULE_VERSION,
    profileSignature: JSON.stringify(profile),
    days: days as WeeklyPlan['days'],
  }
}
