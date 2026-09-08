import type { IDBPDatabase } from 'idb'
export const DATABASE_VERSION = 1
export function migrateDatabase(database: IDBPDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    database.createObjectStore('meta')
    database.createObjectStore('records')
    database.createObjectStore('plans')
    database.createObjectStore('drafts')
  }
}
// Earlier stages used memory only, so there is no persisted legacy schema to convert.
// Future upgrades must add non-destructive migrations here before raising DATABASE_VERSION.
