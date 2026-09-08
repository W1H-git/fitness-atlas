import { defineStore } from 'pinia'
import { ref, computed, onScopeDispose } from 'vue'
import { createOfflineCacheService } from '../services/offline-cache.service'
export const useOfflineStore = defineStore('offline', () => {
  const service = createOfflineCacheService()
  const cached = ref(0),
    total = ref(906),
    failed = ref(0),
    busy = ref(false),
    checking = ref(false),
    error = ref('')
  const online = ref(typeof navigator === 'undefined' || navigator.onLine)
  const supported =
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'caches' in window &&
    'serviceWorker' in navigator
  const complete = computed(
    () => cached.value === total.value && total.value > 0 && !checking.value,
  )
  async function check() {
    if (!supported || import.meta.env.DEV || busy.value) return
    checking.value = true
    error.value = ''
    try {
      assignProgress(await service.status())
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '缓存检查失败'
    } finally {
      checking.value = false
    }
  }
  function assignProgress(value: { cached: number; total: number; failed: number }) {
    cached.value = value.cached
    total.value = value.total
    failed.value = value.failed
  }
  async function download() {
    if (busy.value || !supported) return
    busy.value = true
    error.value = ''
    try {
      await service.download(assignProgress)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '下载失败，请检查空间和网络'
    } finally {
      busy.value = false
    }
  }
  const connection = () => {
    online.value = navigator.onLine
  }
  const visibility = () => {
    if (document.visibilityState === 'visible') void check()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    document.addEventListener('visibilitychange', visibility)
    onScopeDispose(() => {
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
      document.removeEventListener('visibilitychange', visibility)
      service.cancel()
    })
  }
  return {
    cached,
    total,
    failed,
    busy,
    checking,
    error,
    online,
    supported,
    complete,
    check,
    download,
    cancel: service.cancel,
  }
})
