import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { useServicesStore } from './services.store'
import { useProfileStore } from './profile.store'
import { localDate, weekStart } from '../utils/local-date'
import { recommendMuscles } from '../algorithms/recommend-muscles'
import type { Prescription, WeeklyPlan } from '../types/training'

export const usePlanStore = defineStore('plan', () => {
  const services = useServicesStore()
  const profile = useProfileStore()
  const today = ref(localDate())
  const plan = shallowRef<WeeklyPlan | null>(null)
  const loading = ref(false)
  const error = ref('')
  const recommendation = computed(() =>
    plan.value ? recommendMuscles(plan.value, today.value) : null,
  )
  let fingerprint = ''
  let queue: Promise<void> = Promise.resolve()
  function enqueue(action: () => Promise<void>) {
    queue = queue.then(async () => {
      loading.value = true
      error.value = ''
      try {
        await action()
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : '计划加载失败，请重试'
      } finally {
        loading.value = false
      }
    })
    return queue
  }
  function ensure(force = false) {
    return enqueue(async () => {
      await profile.load()
      if (!profile.profile) {
        plan.value = null
        return
      }
      const key = JSON.stringify(profile.profile) + weekStart(today.value)
      if (!force && key === fingerprint && plan.value?.weekStart === weekStart(today.value)) return
      const api = await services.get()
      const saved = !force ? await api.plans.get(profile.profile.id, weekStart(today.value)) : null
      const result =
        saved?.profileSignature === JSON.stringify(profile.profile)
          ? saved
          : await api.recommendations.generate(today.value)
      // Ignore a response if the profile or local date changed during loading.
      if (key !== JSON.stringify(profile.profile) + weekStart(today.value)) return
      plan.value = result
      fingerprint = key
    })
  }
  function adjust(date: string, value: Prescription) {
    return enqueue(async () => {
      if (!profile.profile) throw new Error('请先设置档案')
      plan.value = await (
        await services.get()
      ).recommendations.adjust(profile.profile.id, date, value, today.value)
    })
  }
  function refreshDate() {
    today.value = localDate()
  }
  if (typeof window !== 'undefined') {
    const timer = window.setInterval(refreshDate, 30_000)
    window.addEventListener('focus', refreshDate)
    onScopeDispose(() => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshDate)
    })
  }
  watch(today, () => {
    void ensure()
  })
  function reload() {
    fingerprint = ''
    return ensure()
  }
  return { today, plan, loading, error, recommendation, ensure, adjust, reload }
})
