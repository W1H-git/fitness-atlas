import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import { flushUpdateGuards } from './update-guards'
export const updateAvailable = ref(false),
  shellReady = ref(false),
  registrationError = ref('')
export const updating = ref(false)
export const promptVisible = ref(true)
let registration: ServiceWorkerRegistration | undefined
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined
export function registerPwa() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  applyUpdate = registerSW({
    immediate: true,
    onNeedReload() {
      /* Reload is handled only after our save guards and controller change. */
    },
    onNeedRefresh() {
      updateAvailable.value = true
      promptVisible.value = true
    },
    onOfflineReady() {
      shellReady.value = true
    },
    onRegisteredSW(_url, value) {
      registration = value
      void navigator.serviceWorker.ready.then(() => {
        shellReady.value = true
      })
    },
    onRegisterError(error) {
      registrationError.value = '离线服务注册失败，请联网刷新重试'
      console.error(error)
    },
  })
  window.addEventListener('online', () => {
    void registration?.update().catch(() => {})
  })
}
async function assertSingleWindow() {
  const worker = registration?.active
  if (!worker) throw new Error('离线服务尚未就绪，请稍后重试')
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => {
      channel.port1.close()
      reject(new Error('更新检查超时，请重试'))
    }, 3000)
    channel.port1.onmessage = (event) => {
      clearTimeout(timer)
      channel.port1.close()
      if (event.data > 1) reject(new Error('请先关闭此应用的其他标签页或窗口，再更新'))
      else resolve()
    }
    worker.postMessage({ type: 'COUNT_CLIENTS' }, [channel.port2])
  })
}
export async function updateApplication() {
  if (updating.value) return
  updating.value = true
  registrationError.value = ''
  try {
    await assertSingleWindow()
    await flushUpdateGuards()
    if (!registration?.waiting || !applyUpdate) throw new Error('新版本尚未准备好，请稍后重试')
    await new Promise<void>((resolve, reject) => {
      const previous = navigator.serviceWorker.controller
      const changed = () => {
        if (navigator.serviceWorker.controller !== previous) {
          clearTimeout(timer)
          navigator.serviceWorker.removeEventListener('controllerchange', changed)
          resolve()
        }
      }
      const timer = setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', changed)
        reject(new Error('更新激活超时，请重试；已保存的数据仍在本机'))
      }, 12000)
      navigator.serviceWorker.addEventListener('controllerchange', changed)
      void applyUpdate!(true).catch((error) => {
        clearTimeout(timer)
        navigator.serviceWorker.removeEventListener('controllerchange', changed)
        reject(error)
      })
    })
    window.location.reload()
  } catch (cause) {
    registrationError.value = cause instanceof Error ? cause.message : '更新失败，页面已保留'
    updating.value = false
  }
}
export async function checkForUpdate() {
  try {
    await registration?.update()
    if (registration?.waiting) {
      updateAvailable.value = true
      promptVisible.value = true
    }
  } catch {
    registrationError.value = '无法检查更新，请联网后重试'
  }
}
