import { defineStore } from 'pinia'
import type { createServices } from '../services/create-services'

export const useServicesStore = defineStore('services', () => {
  let pending: Promise<ReturnType<typeof createServices>> | undefined
  function get() {
    pending ??= import('../services/create-services')
      .then(async ({ createServices }) => {
        if (typeof window === 'undefined') return createServices()
        const [{ createIndexedDBRepository }, { createProfileStorage }] = await Promise.all([
          import('../repositories/indexeddb-training.repository'),
          import('../infrastructure/storage/profile-storage'),
        ])
        const profiles = createProfileStorage({
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value),
        })
        return createServices({
          users: createIndexedDBRepository(profiles),
          baseUrl: import.meta.env.BASE_URL,
        })
      })
      .catch((error) => {
        pending = undefined
        throw error
      })
    return pending
  }
  return { get }
})
