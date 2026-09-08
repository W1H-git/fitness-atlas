import type { AbilityLevel, Weekday } from '../types/profile'
import type { MovementPattern } from '../types/exercise'

export interface TrainingTemplate {
  id: string
  days: Weekday[]
  sessions: { label: string; slots: MovementPattern[] }[]
}
/** Templates only; scheduling and recovery checks are implemented in stage 4. */
export const trainingTemplates: Record<AbilityLevel, TrainingTemplate> = {
  beginner: {
    id: 'full-body-3',
    days: [1, 3, 5],
    sessions: [
      { label: '全身 A', slots: ['squat', 'push', 'pull', 'core'] },
      { label: '全身 B', slots: ['hinge', 'push', 'pull', 'core'] },
      { label: '全身 C', slots: ['lunge', 'push', 'pull', 'core'] },
    ],
  },
  intermediate: {
    id: 'upper-lower-4',
    days: [1, 2, 4, 6],
    sessions: [
      { label: '上肢 A', slots: ['push', 'pull', 'push', 'pull'] },
      { label: '下肢 A', slots: ['squat', 'hinge', 'lunge', 'core'] },
      { label: '上肢 B', slots: ['push', 'pull', 'push', 'pull'] },
      { label: '下肢 B', slots: ['squat', 'hinge', 'lunge', 'core'] },
    ],
  },
  advanced: {
    id: 'upper-lower-4',
    days: [1, 2, 4, 6],
    sessions: [
      { label: '上肢 A', slots: ['push', 'pull', 'push', 'pull'] },
      { label: '下肢 A', slots: ['squat', 'hinge', 'lunge', 'core'] },
      { label: '上肢 B', slots: ['push', 'pull', 'push', 'pull'] },
      { label: '下肢 B', slots: ['squat', 'hinge', 'lunge', 'core'] },
    ],
  },
}
