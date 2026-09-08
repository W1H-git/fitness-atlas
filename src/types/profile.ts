import type { Equipment } from './exercise'

export type TrainingGoal = 'muscle-gain' | 'fat-loss'
export type AbilityLevel = 'beginner' | 'intermediate' | 'advanced'
/** ISO weekday: Monday=1, Sunday=7. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface UserProfile {
  id: string
  goal: TrainingGoal
  ability: AbilityLevel
  availableEquipment: Equipment[]
  trainingDays: Weekday[]
}
