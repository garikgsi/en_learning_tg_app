import {indexedDbStores} from '@/api/indexedDb/stores';
import type {IndexedDbMigration} from '@/api/indexedDb/migrations/types';

export const migrationV4: IndexedDbMigration = {
  version: 4,
  up(database) {
    if (!database.objectStoreNames.contains(indexedDbStores.notifications)) {
      const store = database.createObjectStore(
        indexedDbStores.notifications,
        {keyPath: 'key'},
      );
      store.createIndex('by-user', 'userId');
      store.createIndex('by-user-sequence', ['userId', 'sequence']);
    }
  },
};
