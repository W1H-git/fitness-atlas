import type { LocalDataRepository, TrainingDraft } from '../types/local-data'
import type { UserProfile } from '../types/profile'
import type { TrainingRecord, WeeklyPlan } from '../types/training'

export function createMemoryUserRepository(): LocalDataRepository {
  let profile: UserProfile | null = null
  const records = new Map<string, TrainingRecord>()
  const plans = new Map<string, WeeklyPlan>()
  const drafts = new Map<string, TrainingDraft>()
  const planKey = (profileId: string, weekStart: string) => JSON.stringify([profileId, weekStart])
  return {
    async getDraft(id) {
      return structuredClone(drafts.get(id) ?? null)
    },
    async listDrafts(profileId) {
      return structuredClone([...drafts.values()].filter((d) => d.profileId === profileId))
    },
    async saveDraft(draft) {
      if (!records.has(draft.id)) drafts.set(draft.id, structuredClone(draft))
    },
    async commitTraining(record) {
      if (!records.has(record.id)) records.set(record.id, structuredClone(record))
      drafts.delete(record.id)
      for (const plan of plans.values()) {
        if (plan.profileId !== record.profileId) continue
        const day = plan.days.find((d) => d.date === record.date)
        if (
          day?.kind === 'training' &&
          day.prescriptions.length &&
          day.prescriptions.every((p) =>
            [...records.values()].some(
              (r) =>
                r.profileId === record.profileId &&
                r.date === record.date &&
                r.exerciseId === p.exerciseId &&
                r.status === 'completed',
            ),
          )
        )
          day.status = 'completed'
      }
    },
    async snapshot() {
      return structuredClone({
        version: 1,
        exportedAt: new Date().toISOString(),
        profile,
        records: [...records.values()],
        plans: [...plans.values()],
        drafts: [...drafts.values()],
      })
    },
    async replace(data) {
      const next = structuredClone(data)
      profile = next.profile
      records.clear()
      plans.clear()
      drafts.clear()
      next.records.forEach((r) => records.set(r.id, r))
      next.plans.forEach((p) => plans.set(planKey(p.profileId, p.weekStart), p))
      next.drafts.forEach((d) => drafts.set(d.id, d))
    },
    async getProfile() {
      return structuredClone(profile)
    },
    async saveProfile(value) {
      profile = structuredClone(value)
    },
    async listRecords(profileId) {
      return structuredClone(
        [...records.values()].filter((record) => record.profileId === profileId),
      )
    },
    async saveRecord(record) {
      records.set(record.id, structuredClone(record))
    },
    async getPlan(profileId, weekStart) {
      return structuredClone(plans.get(planKey(profileId, weekStart)) ?? null)
    },
    async savePlan(plan) {
      plans.set(planKey(plan.profileId, plan.weekStart), structuredClone(plan))
    },
  }
}
