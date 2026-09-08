import type { Exercise } from './exercise'
import type { UserProfile } from './profile'
import type { TrainingRecord, WeeklyPlan } from './training'

export interface ExerciseRepository {
  list(): Promise<Exercise[]>
  findById(id: string): Promise<Exercise | null>
}
/** Async contracts allow IndexedDB implementations to replace memory in stage 5. */
export interface UserRepository {
  getProfile(): Promise<UserProfile | null>
  saveProfile(profile: UserProfile): Promise<void>
  listRecords(profileId: string): Promise<TrainingRecord[]>
  saveRecord(record: TrainingRecord): Promise<void>
  getPlan(profileId: string, weekStart: string): Promise<WeeklyPlan | null>
  savePlan(plan: WeeklyPlan): Promise<void>
}
