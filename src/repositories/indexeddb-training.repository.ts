import type { IDBPDatabase } from 'idb'
import type { LocalDataRepository, BackupData } from '../types/local-data'
import type { TrainingRecord, WeeklyPlan } from '../types/training'
import type { ProfileStorage } from '../infrastructure/storage/profile-storage'
import { openDatabase } from '../infrastructure/storage/database'
import { weekStart } from '../utils/local-date'

export function createIndexedDBRepository(
  profiles: ProfileStorage,
  name = 'fitness-atlas',
): LocalDataRepository {
  let connection: Promise<IDBPDatabase> | undefined
  let expectedGeneration: string | undefined
  let queue: Promise<unknown> = Promise.resolve()
  async function db() {
    if (!connection) {
      const opening = openDatabase(name)
      connection = new Promise<IDBPDatabase>((resolve, reject) => {
        let expired = false
        const timer = setTimeout(() => {
          expired = true
          reject(new Error('本地数据库无法打开，请关闭其他旧版本页面后重试'))
        }, 5000)
        opening.then(
          (value) => {
            clearTimeout(timer)
            if (expired) {
              value.close()
              return
            }
            resolve(value)
          },
          (error) => {
            clearTimeout(timer)
            reject(error)
          },
        )
      }).catch((error) => {
        connection = undefined
        throw error
      })
    }
    return connection
  }
  async function generation(database: IDBPDatabase, writing = false) {
    const current = ((await database.get('meta', 'active')) as string | undefined) ?? 'initial'
    if (writing && expectedGeneration !== undefined && current !== expectedGeneration)
      throw new Error('数据已在其他页面恢复，请刷新后继续')
    expectedGeneration ??= current
    return current
  }
  function serial<T>(action: () => Promise<T>): Promise<T> {
    const run = () =>
      typeof navigator !== 'undefined' && navigator.locks
        ? navigator.locks.request(name + ':write', action)
        : action()
    const result = queue.then(run)
    queue = result.catch(() => {})
    return result
  }
  const range = (g: string) => IDBKeyRange.bound([g], [g, []])
  const planKey = (g: string, p: WeeklyPlan) => [g, p.profileId, p.weekStart]
  return {
    async getProfile() {
      const database = await db()
      return profiles.read(await generation(database))
    },
    saveProfile(profile) {
      return serial(async () => {
        const database = await db()
        profiles.write(await generation(database, true), profile)
      })
    },
    async listRecords(profileId) {
      const database = await db()
      const g = await generation(database)
      return ((await database.getAll('records', range(g))) as TrainingRecord[]).filter(
        (record) => record.profileId === profileId,
      )
    },
    saveRecord(record) {
      return serial(async () => {
        const database = await db()
        const g = await generation(database, true)
        await database.put('records', record, [g, record.id])
      })
    },
    async getPlan(profileId, start) {
      const database = await db()
      return (await database.get('plans', [await generation(database), profileId, start])) ?? null
    },
    savePlan(plan) {
      return serial(async () => {
        const database = await db()
        const g = await generation(database, true)
        await database.put('plans', plan, planKey(g, plan))
      })
    },
    async getDraft(id) {
      const database = await db()
      return (await database.get('drafts', [await generation(database), id])) ?? null
    },
    async listDrafts(profileId) {
      const database = await db()
      return (await database.getAll('drafts', range(await generation(database)))).filter(
        (draft) => draft.profileId === profileId,
      )
    },
    saveDraft(draft) {
      return serial(async () => {
        const database = await db()
        const g = await generation(database, true)
        const tx = database.transaction(['records', 'drafts'], 'readwrite')
        void tx.done.catch(() => {})
        if (!(await tx.objectStore('records').get([g, draft.id])))
          await tx.objectStore('drafts').put(draft, [g, draft.id])
        await tx.done
      })
    },
    commitTraining(record) {
      return serial(async () => {
        const database = await db()
        const g = await generation(database, true)
        const tx = database.transaction(['records', 'drafts', 'plans'], 'readwrite')
        void tx.done.catch(() => {})
        const records = tx.objectStore('records')
        if (!(await records.get([g, record.id]))) await records.put(record, [g, record.id])
        await tx.objectStore('drafts').delete([g, record.id])
        const key = [g, record.profileId, weekStart(record.date)]
        const plan = (await tx.objectStore('plans').get(key)) as WeeklyPlan | undefined
        const day = plan?.days.find((item) => item.date === record.date)
        if (plan && day?.kind === 'training') {
          const completed = ((await records.getAll(range(g))) as TrainingRecord[]).filter(
            (item) =>
              item.profileId === record.profileId &&
              item.date === record.date &&
              item.status === 'completed',
          )
          if (
            day.prescriptions.length &&
            day.prescriptions.every((p) =>
              completed.some((item) => item.exerciseId === p.exerciseId),
            )
          ) {
            day.status = 'completed'
            await tx.objectStore('plans').put(plan, key)
          }
        }
        await tx.done
      })
    },
    snapshot() {
      return serial(async () => {
        const database = await db()
        const g = await generation(database)
        const profile = profiles.read(g)
        const tx = database.transaction(['records', 'plans', 'drafts'])
        void tx.done.catch(() => {})
        const [records, plans, drafts] = await Promise.all(
          ['records', 'plans', 'drafts'].map((store) => tx.objectStore(store).getAll(range(g))),
        )
        await tx.done
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          profile,
          records,
          plans,
          drafts,
        } as BackupData
      })
    },
    replace(data) {
      return serial(async () => {
        const database = await db()
        await generation(database, true)
        const next = crypto.randomUUID()
        // Prepare the profile under a new key. Readers continue using the old active generation.
        profiles.write(next, data.profile)
        const tx = database.transaction(['records', 'plans', 'drafts', 'meta'], 'readwrite')
        void tx.done.catch(() => {})
        try {
          for (const record of data.records)
            await tx.objectStore('records').put(record, [next, record.id])
          for (const plan of data.plans)
            await tx.objectStore('plans').put(plan, planKey(next, plan))
          for (const draft of data.drafts)
            await tx.objectStore('drafts').put(draft, [next, draft.id])
          await tx.objectStore('meta').put(next, 'active')
          await tx.done
          expectedGeneration = next
        } catch (error) {
          try {
            tx.abort()
          } catch {
            /* Transaction may already have aborted. */
          }
          await tx.done.catch(() => {})
          throw error
        }
        // Previous generations remain intact; a failed import never deletes existing data.
      })
    },
  }
}
