import type {IDBPDatabase} from 'idb';

export type IndexedDbMigration = {
  version: number
  up: (database: IDBPDatabase) => void
}
