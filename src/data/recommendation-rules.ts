import type { AbilityLevel, TrainingGoal } from '../types/profile'
import type { MovementPattern } from '../types/exercise'

export const RULE_VERSION = '1.0.0'
export const abilityRank: Record<AbilityLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
}
export const abilityLabels: Record<AbilityLevel, string> = {
  beginner: '新手',
  intermediate: '中级',
  advanced: '高级',
}
export const goalLabels: Record<TrainingGoal, string> = {
  'muscle-gain': '增肌',
  'fat-loss': '减脂',
}
export const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const
export const setsByGoal: Record<TrainingGoal, Record<AbilityLevel, number>> = {
  'muscle-gain': { beginner: 2, intermediate: 3, advanced: 3 },
  'fat-loss': { beginner: 2, intermediate: 2, advanced: 3 },
}
export const durationByAbility: Record<AbilityLevel, { min: number; max: number }> = {
  beginner: { min: 20, max: 30 },
  intermediate: { min: 30, max: 45 },
  advanced: { min: 40, max: 60 },
}
export const patternLabels: Record<MovementPattern, string> = {
  push: '推类动作',
  pull: '拉类动作',
  squat: '蹲类动作',
  hinge: '髋部主导动作',
  lunge: '弓步／分腿动作',
  core: '核心动作',
  carry: '负重行走',
  other: '辅助动作',
}
