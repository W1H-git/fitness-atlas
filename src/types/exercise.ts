import type { AbilityLevel } from './profile'

export const muscleLabels = {
  Adductors: '内收肌',
  Back: '背部',
  Biceps: '肱二头肌',
  Calves: '小腿',
  Cardio: '心肺',
  Chest: '胸部',
  Core: '核心',
  Forearms: '前臂',
  Glutes: '臀部',
  Grip: '握力',
  Groin: '腹股沟',
  Hamstrings: '腘绳肌',
  Hips: '髋部',
  Lats: '背阔肌',
  Legs: '腿部',
  'Lower Back': '下背部',
  Mobility: '活动度',
  'Posterior Chain': '后侧链',
  Quads: '股四头肌',
  'Rear Delts': '三角肌后束',
  Shoulders: '肩部',
  Triceps: '肱三头肌',
  'Upper Back': '上背部',
} as const
export type Muscle = keyof typeof muscleLabels

export const equipmentLabels = {
  Barbell: '杠铃',
  Bench: '训练凳',
  Bodyweight: '徒手',
  Box: '跳箱',
  Cable: '绳索',
  Cardio: '有氧设备',
  Chair: '椅子',
  Doorway: '门框',
  Dumbbell: '哑铃',
  Kettlebell: '壶铃',
  Machine: '固定器械',
  Plate: '杠铃片',
  'Pull-up Bar': '单杠',
  'Resistance Band': '弹力带',
  'Stability Ball': '健身球',
  Towel: '毛巾',
  Wall: '墙面',
  Rack: '深蹲架',
  'Parallel Bars': '双杠',
} as const
export type Equipment = keyof typeof equipmentLabels
export type ExerciseCategory = 'compound' | 'isolation' | 'core' | 'cardio' | 'mobility'
export type MovementPattern =
  'push' | 'pull' | 'squat' | 'hinge' | 'lunge' | 'core' | 'carry' | 'other'
export type Triple<T> = [T, T, T]
export type Measurement = 'reps' | 'duration' | 'distance-duration'

/** Separate load from measurement: a timed cable hold still has external resistance. */
export type LoadConvention =
  | { kind: 'bodyweight'; label: string }
  | { kind: 'external'; unit: 'kg'; basis: 'per-hand' | 'total' | 'machine-stack'; label: string }
  | { kind: 'assistance'; unit: 'kg'; basis: 'machine-stack'; label: string }
  | { kind: 'band'; label: string }
  | { kind: 'none'; label: string }

export interface Attribution {
  creator: string
  creatorUrl: string
  license: string
  licenseUrl: string
  source?: { name: string; url: string; license: string; licenseUrl: string; changes: string }
}
export interface ExerciseFrame {
  index: 1 | 2 | 3
  path: string
  width: number
  height: number
  format: 'png'
  attribution: Attribution
}
export interface ExerciseContent {
  name: string
  aliases: string[]
  difficulty: AbilityLevel
  category: ExerciseCategory
  pattern: MovementPattern
  steps: Triple<string>
  commonMistakes: string[]
  variationNote: string
  illustrationNotes: string[]
  /** Local editorial fields, never presented as upstream metadata. */
  editorialSource: 'fitness-atlas'
  reviewStatus: 'catalog-reviewed' | 'recommendation-reviewed'
  recommendationEligible: boolean
  requiredEquipment: Equipment[]
}
export interface Exercise extends ExerciseContent {
  id: string
  upstreamId: string
  nameEn: string
  primaryMuscle: Muscle
  secondaryMuscles: Muscle[]
  equipment: Equipment
  isStretch: boolean
  measurement: Measurement
  load: LoadConvention
  frames: Triple<ExerciseFrame>
  attribution: Attribution
  sourceVersion: string
}
export interface ExerciseFilters {
  query?: string
  muscle?: Muscle
  equipment?: Equipment
  difficulty?: AbilityLevel
  recommendationOnly?: boolean
}
