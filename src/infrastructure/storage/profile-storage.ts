import { parseProfile } from '../../utils/validate-profile'
import type { UserProfile } from '../../types/profile'
export interface ProfileStorage {
  read(generation: string): UserProfile | null
  write(generation: string, profile: UserProfile | null): void
}
export function createProfileStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  prefix = 'fitness-atlas:profile:',
): ProfileStorage {
  return {
    read(generation) {
      const text = storage.getItem(prefix + generation)
      if (text === null) {
        if (generation !== 'initial')
          throw new Error('档案数据缺失，请从备份恢复；原训练数据未删除')
        return null
      }
      const wrapper = JSON.parse(text) as { version?: number; profile?: unknown }
      if (wrapper.version !== 1) throw new Error('档案版本不支持，请先更新应用')
      return wrapper.profile === null ? null : parseProfile(wrapper.profile)
    },
    write(generation, profile) {
      storage.setItem(
        prefix + generation,
        JSON.stringify({ version: 1, profile: profile === null ? null : parseProfile(profile) }),
      )
    },
  }
}
