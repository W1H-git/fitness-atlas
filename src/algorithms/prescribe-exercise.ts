import type { Exercise } from '../types/exercise'
import type { UserProfile } from '../types/profile'
import type { Prescription, TrainingRecord } from '../types/training'
import {
  abilityLabels,
  durationByAbility,
  goalLabels,
  setsByGoal,
} from '../data/recommendation-rules'
import { recommendLoad } from './recommend-load'
import type { LoadContext, LoadTarget } from './recommend-load'

export function prescribeExercise(
  exercise: Exercise,
  profile: UserProfile,
  history: readonly TrainingRecord[],
  date: string,
  context?: LoadContext,
): Prescription {
  const sets = setsByGoal[profile.goal][profile.ability]
  const target: LoadTarget = {
    sets,
    measurement: exercise.measurement,
    ...(exercise.measurement === 'reps' ? { min: 8, max: 12 } : durationByAbility[profile.ability]),
  }
  const base = {
    exerciseId: exercise.id,
    sets,
    restSeconds: exercise.category === 'compound' ? 120 : 90,
    load: recommendLoad(
      exercise,
      target,
      history.filter((record) => record.profileId === profile.id),
      date,
      context,
    ),
    reason:
      goalLabels[profile.goal] +
      ' · ' +
      abilityLabels[profile.ability] +
      '的起始模板，可根据实际完成情况调整。' +
      (profile.goal === 'fat-loss' ? '减脂模式保留力量练习，不以高次数承诺局部减脂。' : ''),
  }
  if (exercise.measurement === 'reps')
    return { ...base, measurement: 'reps', reps: { min: 8, max: 12 } }
  if (exercise.measurement === 'duration')
    return { ...base, measurement: 'duration', seconds: { ...durationByAbility[profile.ability] } }
  return { ...base, sets: 1, measurement: 'distance-duration', seconds: 600, meters: null }
}
