import { defineStore } from 'pinia'
import { shallowRef, onScopeDispose } from 'vue'
import { trainingId } from '../types/local-data'
import { registerUpdateGuard } from '../pwa/update-guards'
import { useServicesStore } from './services.store'
import { useProfileStore } from './profile.store'
import type { TrainingRecord, Prescription } from '../types/training'
import type { TrainingDraft } from '../types/local-data'

export const useTrainingStore = defineStore('training', () => {
  const services = useServicesStore()
  const profile = useProfileStore()
  const records = shallowRef<TrainingRecord[]>([])
  const drafts = shallowRef<TrainingDraft[]>([])
  const unsaved = new Map<string, TrainingDraft>()
  onScopeDispose(
    registerUpdateGuard(async () => {
      for (const value of [...unsaved.values()]) await saveDraft(value)
      if (unsaved.size) throw new Error('仍有未保存训练，已暂停更新')
    }),
  )
  if (typeof window !== 'undefined') {
    const warn = (event: BeforeUnloadEvent) => {
      if (unsaved.size) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    onScopeDispose(() => window.removeEventListener('beforeunload', warn))
  }
  let loadedProfile = ''
  let pending: Promise<void> | undefined
  async function load(force = false) {
    await profile.load()
    if (!profile.profile) {
      records.value = []
      drafts.value = []
      return
    }
    if (!force && loadedProfile === profile.profile.id) return
    if (pending) return pending
    const id = profile.profile.id
    pending = (async () => {
      const api = (await services.get()).training
      const [saved, unfinished] = await Promise.all([api.list(id), api.listDrafts(id)])
      records.value = saved
      drafts.value = unfinished
      loadedProfile = id
    })().finally(() => {
      pending = undefined
    })
    return pending
  }
  async function open(exerciseId: string, date: string, prescription: Prescription) {
    const retained = unsaved.get(trainingId(profile.profile?.id ?? '', date, exerciseId))
    if (retained) return structuredClone(retained)
    return (await services.get()).training.open(exerciseId, date, prescription)
  }
  async function saveDraft(draft: TrainingDraft) {
    unsaved.set(draft.id, draft)
    await (await services.get()).training.saveDraft(draft)
    if (unsaved.get(draft.id) === draft) unsaved.delete(draft.id)
    drafts.value = [...drafts.value.filter((item) => item.id !== draft.id), draft]
  }
  async function complete(draft: TrainingDraft) {
    await (await services.get()).training.complete(draft)
    unsaved.delete(draft.id)
    await load(true)
  }
  return { records, drafts, load, open, saveDraft, complete }
})
