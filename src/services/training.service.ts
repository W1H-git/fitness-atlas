import type { ExerciseRepository } from '../types/repository'
import type { LocalDataRepository, TrainingDraft } from '../types/local-data'
import { trainingId } from '../types/local-data'
import type { Prescription, TrainingRecord, TrainingSet, LoadValue } from '../types/training'
import { validateDraft, validateRecord } from '../utils/validate-backup'
import { localDate } from '../utils/local-date'
export function createTrainingService(users: LocalDataRepository, exercises: ExerciseRepository) {
  return {
    list: users.listRecords.bind(users),
    listDrafts: users.listDrafts.bind(users),
    async open(
      exerciseId: string,
      date: string,
      prescription: Prescription,
    ): Promise<TrainingDraft> {
      const profile = await users.getProfile()
      if (!profile) throw new Error('请先设置训练档案')
      const id = trainingId(profile.id, date, exerciseId)
      const existing = await users.getDraft(id)
      if (existing) return existing
      const history = (await users.listRecords(profile.id))
        .filter((record) => record.exerciseId === exerciseId && record.date <= date)
        .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      const latest = history[0]
      const load = prescription.load
      const kg =
        load.status === 'suggested' &&
        (load.value.kind === 'external' || load.value.kind === 'assistance')
          ? String(load.value.kg)
          : ''
      return {
        id,
        profileId: profile.id,
        exerciseId,
        date,
        equipmentKey: latest?.equipmentKey ?? exerciseId,
        availableWeights: latest?.availableWeightsKg?.join(', ') ?? '',
        notes: '',
        rows: Array.from({ length: prescription.sets }, (_, index) => ({
          id: String(index + 1),
          reps: '',
          seconds: '',
          meters: '',
          kg,
          resistanceLabel: '',
          remainingReps: '',
          completed: false,
        })),
      }
    },
    async saveDraft(value: unknown) {
      const draft = validateDraft(value, await exercises.list())
      const profile = await users.getProfile()
      if (draft.profileId !== profile?.id) throw new Error('训练档案已变化，请刷新')
      await users.saveDraft(draft)
    },
    async complete(value: unknown) {
      const catalog = await exercises.list()
      const draft = validateDraft(value, catalog)
      if (draft.date > localDate()) throw new Error('不能提交未来的训练记录')
      const profile = await users.getProfile()
      if (draft.profileId !== profile?.id) throw new Error('训练档案已变化，请刷新')
      const exercise = catalog.find((e) => e.id === draft.exerciseId)!
      const number = (text: string, label: string) => {
        if (!text.trim() || !Number.isFinite(Number(text))) throw new Error('请填写有效的' + label)
        return Number(text)
      }
      const weights = draft.availableWeights.trim()
        ? draft.availableWeights
            .split(/[,，\s]+/)
            .filter(Boolean)
            .map((text) => number(text, '重量档位'))
        : []
      const sets: TrainingSet[] = draft.rows
        .filter((row) => row.completed)
        .map((row) => {
          const kind = exercise.load.kind
          let load: LoadValue
          if (kind === 'external' || kind === 'assistance') {
            const convention = exercise.load
            if (convention.kind !== 'external' && convention.kind !== 'assistance')
              throw new Error('负重类型无效')
            load = { kind, kg: number(row.kg, '重量'), basis: convention.basis }
          } else if (kind === 'band') load = { kind, resistanceLabel: row.resistanceLabel }
          else load = { kind }
          const base = {
            id: row.id,
            completed: true,
            load,
            remainingReps: row.remainingReps.trim() ? number(row.remainingReps, '剩余能力') : null,
          }
          if (exercise.measurement === 'reps')
            return { ...base, measurement: 'reps', reps: number(row.reps, '次数') }
          if (exercise.measurement === 'duration')
            return { ...base, measurement: 'duration', seconds: number(row.seconds, '时长') }
          return {
            ...base,
            measurement: 'distance-duration',
            seconds: number(row.seconds, '时长'),
            meters: number(row.meters, '距离'),
          }
        })
      if (!sets.length) throw new Error('请至少勾选一个实际完成的训练组')
      const record: TrainingRecord = validateRecord(
        {
          id: draft.id,
          profileId: draft.profileId,
          exerciseId: draft.exerciseId,
          date: draft.date,
          equipmentKey: draft.equipmentKey.trim(),
          availableWeightsKg: weights,
          sets,
          notes: draft.notes,
          performedAt: new Date().toISOString(),
          status: 'completed',
        },
        catalog,
      )
      await users.commitTraining(record)
    },
  }
}
