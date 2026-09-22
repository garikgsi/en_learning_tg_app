import {indexedDbStores} from '@/api/indexedDb/stores';
import type {IndexedDbMigration} from '@/api/indexedDb/migrations/types';

export const migrationV5: IndexedDbMigration = {
  version: 5,
  up(database) {
    if (!database.objectStoreNames.contains(indexedDbStores.grammarRaceSessions)) {
      const store = database.createObjectStore(
        indexedDbStores.grammarRaceSessions,
        {keyPath: 'key'},
      );
      store.createIndex('by-user', 'userId');
    }

    if (!database.objectStoreNames.contains(indexedDbStores.grammarRaceOutbox)) {
      const store = database.createObjectStore(
        indexedDbStores.grammarRaceOutbox,
        {keyPath: 'clientResultId'},
      );
      store.createIndex('by-user-created-at', ['userId', 'createdAt']);
      store.createIndex('by-user-status', ['userId', 'status']);
    }
  },
};
