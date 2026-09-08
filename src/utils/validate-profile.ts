import { z } from 'zod'
import { equipmentLabels } from '../types/exercise'
import type { Equipment } from '../types/exercise'
import type { UserProfile } from '../types/profile'
const schema = z
  .object({
    id: z.string().trim().min(1),
    goal: z.enum(['muscle-gain', 'fat-loss']),
    ability: z.enum(['beginner', 'intermediate', 'advanced']),
    availableEquipment: z
      .array(z.enum(Object.keys(equipmentLabels) as [Equipment, ...Equipment[]]))
      .min(1, '请至少选择一种可用器械'),
    trainingDays: z.array(
      z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
        z.literal(7),
      ]),
    ),
  })
  .superRefine((profile, context) => {
    const expected = profile.ability === 'beginner' ? 3 : 4
    const days = [...new Set(profile.trainingDays)].sort((a, b) => a - b)
    if (days.length !== expected || days.length !== profile.trainingDays.length) {
      context.addIssue({
        code: 'custom',
        message: '请选择' + expected + '个不同的训练日',
        path: ['trainingDays'],
      })
    }
    if (
      profile.ability === 'beginner' &&
      days.some((day, index) => (days[(index + 1) % days.length]! - day + 7) % 7 === 1)
    ) {
      context.addIssue({
        code: 'custom',
        message: '新手训练日之间至少休息一天，周日与下周一也不能相邻',
        path: ['trainingDays'],
      })
    }
  })
export function profileErrors(input: unknown): string[] {
  const result = schema.safeParse(input)
  return result.success ? [] : [...new Set(result.error.issues.map((issue) => issue.message))]
}
export function parseProfile(input: unknown): UserProfile {
  const result = schema.safeParse(input)
  if (!result.success) throw new Error(result.error.issues.map((issue) => issue.message).join('；'))
  return {
    ...result.data,
    availableEquipment: [...new Set(result.data.availableEquipment)],
    trainingDays: [...result.data.trainingDays].sort((a, b) => a - b),
  }
}
