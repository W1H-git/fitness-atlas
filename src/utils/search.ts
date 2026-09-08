import { equipmentLabels, muscleLabels } from '../types/exercise'
import type { Exercise, ExerciseFilters } from '../types/exercise'

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesExercise(exercise: Exercise, filters: ExerciseFilters = {}): boolean {
  if (
    filters.muscle &&
    ![exercise.primaryMuscle, ...exercise.secondaryMuscles].includes(filters.muscle)
  )
    return false
  if (filters.equipment && exercise.equipment !== filters.equipment) return false
  if (filters.difficulty && exercise.difficulty !== filters.difficulty) return false
  if (filters.recommendationOnly && !exercise.recommendationEligible) return false
  const text = normalizeSearchText(
    [
      exercise.id,
      exercise.name,
      exercise.nameEn,
      ...exercise.aliases,
      exercise.equipment,
      equipmentLabels[exercise.equipment],
      exercise.primaryMuscle,
      muscleLabels[exercise.primaryMuscle],
      ...exercise.secondaryMuscles.flatMap((muscle) => [muscle, muscleLabels[muscle]]),
    ].join(' '),
  )
  return normalizeSearchText(filters.query ?? '')
    .split(' ')
    .filter(Boolean)
    .every((term) => text.includes(term))
}
