import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'
import type { UserProfile } from '../types/profile'
import { useServicesStore } from './services.store'
import { parseProfile } from '../utils/validate-profile'

export const useProfileStore = defineStore('profile', () => {
  const services = useServicesStore()
  const profile = shallowRef<UserProfile | null>(null)
  const ready = ref(false)
  let pending: Promise<void> | undefined
  async function load() {
    if (ready.value) return
    pending ??= (async () => {
      profile.value = await (await services.get()).profile.get()
      ready.value = true
    })().finally(() => {
      pending = undefined
    })
    return pending
  }
  async function save(value: UserProfile) {
    const parsed = parseProfile(value)
    await (await services.get()).profile.save(parsed)
    profile.value = parsed
    ready.value = true
  }
  return { profile, ready, load, save }
})
