import { z } from 'zod'
import { equipmentLabels, muscleLabels } from '../types/exercise'
import type { Exercise, ExerciseContent, Equipment, Muscle } from '../types/exercise'

const nonempty = z.string().trim().min(1)
const equipment = z.enum(Object.keys(equipmentLabels) as [Equipment, ...Equipment[]])
const muscle = z.enum(Object.keys(muscleLabels) as [Muscle, ...Muscle[]])
const attribution = z.object({
  creator: nonempty,
  creatorUrl: z.url(),
  license: z.literal('CC BY-SA 4.0'),
  licenseUrl: z.literal('https://creativecommons.org/licenses/by-sa/4.0/'),
  source: z
    .object({
      name: nonempty,
      url: z.url(),
      license: nonempty,
      licenseUrl: z.url(),
      changes: nonempty,
    })
    .optional(),
})

export const contentSchema: z.ZodType<ExerciseContent> = z
  .object({
    name: nonempty.regex(/[\u3400-\u9fff]/, 'Chinese name required'),
    aliases: z.array(nonempty),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    category: z.enum(['compound', 'isolation', 'core', 'cardio', 'mobility']),
    pattern: z.enum(['push', 'pull', 'squat', 'hinge', 'lunge', 'core', 'carry', 'other']),
    steps: z.tuple([nonempty, nonempty, nonempty]),
    commonMistakes: z.array(nonempty).min(1),
    variationNote: nonempty,
    illustrationNotes: z.array(nonempty),
    editorialSource: z.literal('fitness-atlas'),
    reviewStatus: z.enum(['catalog-reviewed', 'recommendation-reviewed']),
    recommendationEligible: z.boolean(),
    requiredEquipment: z.array(equipment).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.recommendationEligible && value.illustrationNotes.length) {
      ctx.addIssue({ code: 'custom', message: 'Disputed illustrations cannot be recommended' })
    }
    if (value.recommendationEligible !== (value.reviewStatus === 'recommendation-reviewed')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Recommendation requires an explicit review',
        path: ['reviewStatus'],
      })
    }
  })

const load = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('bodyweight'), label: nonempty }),
  z.object({
    kind: z.literal('external'),
    unit: z.literal('kg'),
    basis: z.enum(['per-hand', 'total', 'machine-stack']),
    label: nonempty,
  }),
  z.object({
    kind: z.literal('assistance'),
    unit: z.literal('kg'),
    basis: z.literal('machine-stack'),
    label: nonempty,
  }),
  z.object({ kind: z.literal('band'), label: nonempty }),
  z.object({ kind: z.literal('none'), label: nonempty }),
])
const frame = z.object({
  index: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  path: nonempty.regex(/^exercises\/[a-z0-9]+(?:-[a-z0-9]+)*\/[123]\.png$/),
  width: z.literal(512),
  height: z.literal(512),
  format: z.literal('png'),
  attribution,
})
const exerciseSchema: z.ZodType<Exercise> = z
  .intersection(
    contentSchema,
    z.object({
      id: nonempty.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      upstreamId: nonempty,
      nameEn: nonempty,
      primaryMuscle: muscle,
      secondaryMuscles: z.array(muscle),
      equipment,
      isStretch: z.boolean(),
      measurement: z.enum(['reps', 'duration', 'distance-duration']),
      load,
      frames: z.tuple([frame, frame, frame]),
      attribution,
      sourceVersion: z.literal('1.0.0'),
    }),
  )
  .superRefine((value, ctx) => {
    value.frames.forEach((item, i) => {
      if (item.index !== i + 1 || item.path !== `exercises/${value.id}/${i + 1}.png`) {
        ctx.addIssue({
          code: 'custom',
          message: 'Incorrect frame identity or ordering',
          path: ['frames', i],
        })
      }
    })
    if (!value.requiredEquipment.includes(value.equipment)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Primary equipment missing from requirements',
        path: ['requiredEquipment'],
      })
    }
    if (value.isStretch && value.recommendationEligible) {
      ctx.addIssue({ code: 'custom', message: 'Stretch is not a resistance-plan candidate' })
    }
  })

export function parseCatalog(input: unknown): Exercise[] {
  const result = z.array(exerciseSchema).min(1).parse(input)
  if (new Set(result.map((item) => item.id)).size !== result.length)
    throw new Error('Duplicate exercise ID')
  if (new Set(result.map((item) => item.upstreamId)).size !== result.length)
    throw new Error('Duplicate upstream ID')
  return result
}
