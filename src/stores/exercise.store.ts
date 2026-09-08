import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import type { AbilityLevel } from '../types/profile'
import type { Equipment, Exercise, ExerciseFrame, Muscle } from '../types/exercise'
import { matchesExercise } from '../utils/search'
import { resolveFrameUrl } from '../services/exercise.service'
import { useServicesStore } from './services.store'

export const useExerciseStore = defineStore('exercises', () => {
  const serviceStore = useServicesStore()
  const items = shallowRef<Exercise[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref('')
  const query = ref('')
  const muscle = ref<Muscle | ''>('')
  const equipment = ref<Equipment | ''>('')
  const difficulty = ref<AbilityLevel | ''>('')
  const limit = ref(12)
  let pending: Promise<void> | null = null
  const byId = computed(() => new Map(items.value.map((item) => [item.id, item])))
  const results = computed(() =>
    items.value.filter((item) =>
      matchesExercise(item, {
        query: query.value,
        muscle: muscle.value || undefined,
        equipment: equipment.value || undefined,
        difficulty: difficulty.value || undefined,
      }),
    ),
  )
  const visible = computed(() => results.value.slice(0, limit.value))
  const equipmentOptions = computed(() => [...new Set(items.value.map((item) => item.equipment))])
  const muscleOptions = computed(() => [
    ...new Set(items.value.flatMap((item) => [item.primaryMuscle, ...item.secondaryMuscles])),
  ])
  const activeFilters = computed(
    () =>
      [query.value.trim(), muscle.value, equipment.value, difficulty.value].filter(Boolean).length,
  )
  watch(
    [query, muscle, equipment, difficulty],
    () => {
      limit.value = 12
    },
    { flush: 'sync' },
  )

  async function load(): Promise<void> {
    if (status.value === 'ready') return
    if (pending) return pending
    status.value = 'loading'
    error.value = ''
    pending = (async () => {
      try {
        const services = await serviceStore.get()
        items.value = await services.exercises.search()
        status.value = 'ready'
      } catch {
        error.value = '动作数据加载失败，请检查连接后重试。'
        status.value = 'error'
      } finally {
        pending = null
      }
    })()
    return pending
  }
  function resetFilters() {
    query.value = ''
    muscle.value = ''
    equipment.value = ''
    difficulty.value = ''
    limit.value = 12
  }
  function frameUrl(frame: ExerciseFrame) {
    return resolveFrameUrl(frame, import.meta.env.BASE_URL)
  }
  function find(id: string) {
    return byId.value.get(id) ?? null
  }
  function showMore() {
    limit.value += 12
  }
  function retryLoad() {
    // Browsers may cache a failed dynamic import; reload retries its module graph.
    window.location.reload()
  }
  return {
    items,
    status,
    error,
    query,
    muscle,
    equipment,
    difficulty,
    results,
    visible,
    equipmentOptions,
    muscleOptions,
    activeFilters,
    load,
    resetFilters,
    frameUrl,
    find,
    showMore,
    retryLoad,
  }
})
