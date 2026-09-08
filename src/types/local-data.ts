import type { UserProfile } from './profile'
import type { TrainingRecord, WeeklyPlan } from './training'
import type { UserRepository } from './repository'
export interface DraftRow {
  id: string
  reps: string
  seconds: string
  meters: string
  kg: string
  resistanceLabel: string
  remainingReps: string
  completed: boolean
}
export interface TrainingDraft {
  id: string
  profileId: string
  exerciseId: string
  date: string
  equipmentKey: string
  availableWeights: string
  notes: string
  rows: DraftRow[]
}
export interface BackupData {
  version: 1
  exportedAt: string
  profile: UserProfile | null
  plans: WeeklyPlan[]
  records: TrainingRecord[]
  drafts: TrainingDraft[]
}
export interface LocalDataRepository extends UserRepository {
  getDraft(id: string): Promise<TrainingDraft | null>
  saveDraft(draft: TrainingDraft): Promise<void>
  listDrafts(profileId: string): Promise<TrainingDraft[]>
  commitTraining(record: TrainingRecord): Promise<void>
  snapshot(): Promise<BackupData>
  replace(data: BackupData): Promise<void>
}
export const trainingId = (profileId: string, date: string, exerciseId: string) =>
  JSON.stringify([profileId, date, exerciseId])
