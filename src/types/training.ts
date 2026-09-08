import type { LoadConvention, Muscle } from './exercise'

export type LoadValue =
  | { kind: 'bodyweight' | 'none' }
  | { kind: 'external' | 'assistance'; kg: number; basis: 'per-hand' | 'total' | 'machine-stack' }
  | { kind: 'band'; resistanceLabel: string }

interface SetBase {
  id: string
  load: LoadValue
  remainingReps: number | null
  completed: boolean
}
export type TrainingSet =
  | (SetBase & { measurement: 'reps'; reps: number })
  | (SetBase & { measurement: 'duration'; seconds: number })
  | (SetBase & { measurement: 'distance-duration'; seconds: number; meters: number })

export interface TrainingRecord {
  id: string
  profileId: string
  exerciseId: string
  /** Local calendar date YYYY-MM-DD, not a UTC date derived by slicing an ISO timestamp. */
  date: string
  performedAt: string
  equipmentKey: string
  availableWeightsKg?: number[]
  sets: TrainingSet[]
  notes: string
  status: 'draft' | 'completed'
}
export type LoadSuggestion =
  | { status: 'needs-calibration'; convention: LoadConvention; reason: string }
  | { status: 'suggested'; value: LoadValue; reason: string; basedOnRecordIds: string[] }

interface PrescriptionBase {
  exerciseId: string
  sets: number
  restSeconds: number
  load: LoadSuggestion
  reason: string
}
export type Prescription =
  | (PrescriptionBase & { measurement: 'reps'; reps: { min: number; max: number } })
  | (PrescriptionBase & { measurement: 'duration'; seconds: { min: number; max: number } })
  | (PrescriptionBase & {
      measurement: 'distance-duration'
      seconds: number
      meters: number | null
    })

export type PlanDay =
  | { date: string; kind: 'rest'; reason: string }
  | {
      date: string
      kind: 'training'
      label?: string
      missingSlots?: string[]
      warnings?: string[]
      muscles: Muscle[]
      prescriptions: Prescription[]
      status: 'planned' | 'completed' | 'skipped'
    }

export interface WeeklyPlan {
  id: string
  profileId: string
  weekStart: string
  ruleVersion: string
  profileSignature?: string
  days: [PlanDay, PlanDay, PlanDay, PlanDay, PlanDay, PlanDay, PlanDay]
}
