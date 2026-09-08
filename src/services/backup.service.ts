import type { ExerciseRepository } from '../types/repository'
import type { LocalDataRepository } from '../types/local-data'
import { validateBackup } from '../utils/validate-backup'
export function createBackupService(users: LocalDataRepository, exercises: ExerciseRepository) {
  async function validate(value: unknown) {
    try {
      return validateBackup(value, await exercises.list())
    } catch (cause) {
      throw new Error('备份校验失败：' + (cause instanceof Error ? cause.message : '格式不支持'), {
        cause,
      })
    }
  }
  return {
    async export() {
      return JSON.stringify(await validate(await users.snapshot()), null, 2)
    },
    async preview(text: string) {
      if (text.length > 20_000_000) throw new Error('备份超过20 MB，请选择正确的备份文件')
      let value: unknown
      try {
        value = JSON.parse(text)
      } catch {
        throw new Error('不是有效的 JSON 备份，原数据未修改')
      }
      return validate(value)
    },
    async restore(value: unknown) {
      await users.replace(await validate(value))
    },
  }
}
