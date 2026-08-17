import {indexedDbStores} from '@/api/indexedDb/stores';
import type {IndexedDbMigration} from '@/api/indexedDb/migrations/types';

export const migrationV2: IndexedDbMigration = {
  version: 2,
  up(database) {
    if (!database.objectStoreNames.contains(indexedDbStores.completionOutbox)) {
      const store = database.createObjectStore(
        indexedDbStores.completionOutbox,
        {keyPath: 'attemptId'},
      );
      store.createIndex('by-user-created-at', ['userId', 'createdAt']);
      store.createIndex('by-user-status', ['userId', 'status']);
    }

    if (!database.objectStoreNames.contains(indexedDbStores.users)) {
      database.createObjectStore(indexedDbStores.users, {
        keyPath: 'userId',
      });
    }

    if (!database.objectStoreNames.contains(indexedDbStores.dictionaryWords)) {
      const store = database.createObjectStore(
        indexedDbStores.dictionaryWords,
        {keyPath: 'key'},
      );
      store.createIndex('by-user', 'userId');
    }

    if (!database.objectStoreNames.contains(indexedDbStores.dictionaryMetadata)) {
      database.createObjectStore(indexedDbStores.dictionaryMetadata, {
        keyPath: 'userId',
      });
    }
  },
};
