import { ref, shallowRef } from 'vue'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export const installEvent = shallowRef<InstallEvent | null>(null)
export const installed = ref(false)
let listening = false

export function captureInstallPrompt() {
  if (import.meta.env.DEV || listening) return
  listening = true
  installed.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installEvent.value = event as InstallEvent
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    installEvent.value = null
  })
}
