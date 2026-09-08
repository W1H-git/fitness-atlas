import type { ExerciseRepository, UserRepository } from '../types/repository'
import type { Prescription } from '../types/training'
import { generateWeek } from '../algorithms/generate-week'
import { addDays, weekStart } from '../utils/local-date'
import { validatePrescription } from '../utils/validate-prescription'
import type { LoadContext } from '../algorithms/recommend-load'

export function createRecommendationService(exercises: ExerciseRepository, users: UserRepository) {
  return {
    async generate(today: string, loadContexts: Record<string, LoadContext> = {}) {
      const profile = await users.getProfile()
      if (!profile) throw new Error('请先设置训练档案')
      const start = weekStart(today)
      const [catalog, records, existing, previous] = await Promise.all([
        exercises.list(),
        users.listRecords(profile.id),
        users.getPlan(profile.id, start),
        users.getPlan(profile.id, addDays(start, -7)),
      ])
      const plan = generateWeek({
        loadContexts: {
          ...Object.fromEntries(
            [...records]
              .filter((r) => r.status === 'completed' && r.date < today)
              .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
              .map((r) => [
                r.exerciseId,
                { equipmentKey: r.equipmentKey, availableWeightsKg: r.availableWeightsKg ?? [] },
              ]),
          ),
          ...loadContexts,
        },
        profile,
        exercises: catalog,
        records,
        existing,
        previous,
        today,
        weekStart: start,
      })
      await users.savePlan(plan)
      return plan
    },
    async adjust(profileId: string, date: string, value: Prescription, today: string) {
      const plan = await users.getPlan(profileId, weekStart(date))
      const day = plan?.days.find((item) => item.date === date)
      if (!plan || day?.kind !== 'training' || date < today || day.status !== 'planned')
        throw new Error('只能调整今天或未来尚未完成的训练')
      const index = day.prescriptions.findIndex((item) => item.exerciseId === value.exerciseId)
      const exercise = await exercises.findById(value.exerciseId)
      if (index < 0 || !exercise) throw new Error('动作不属于这一天的计划')
      validatePrescription(value, exercise)
      day.prescriptions[index] = {
        ...structuredClone(value),
        reason: '用户手动调整，仅修改计划，未记作实际训练。',
      }
      await users.savePlan(plan)
      return plan
    },
  }
}
