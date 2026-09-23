import {indexedDbStores} from '@/api/indexedDb/stores';
import type {IndexedDbMigration} from '@/api/indexedDb/migrations/types';

export const migrationV6: IndexedDbMigration = {
  version: 6,
  up(database) {
    if (!database.objectStoreNames.contains(indexedDbStores.exerciseProgress)) {
      const store = database.createObjectStore(
        indexedDbStores.exerciseProgress,
        {keyPath: 'key'},
      );
      store.createIndex('by-user', 'userId');
    }
  },
};
