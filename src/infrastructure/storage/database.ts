import { openDB } from 'idb'
import { DATABASE_VERSION, migrateDatabase } from './migrations'
export function openDatabase(name = 'fitness-atlas') {
  return openDB(name, DATABASE_VERSION, {
    upgrade: migrateDatabase,
    blocked() {
      /* The caller's timeout reports the blocked upgrade without deleting data. */
    },
    blocking(_current, _blocked, event) {
      ;(event.target as IDBDatabase).close()
    },
  })
}
