import {indexedDbStores} from '@/api/indexedDb/stores';
import type {IndexedDbMigration} from '@/api/indexedDb/migrations/types';

export const migrationV1: IndexedDbMigration = {
  version: 1,
  up(database) {
    if (!database.objectStoreNames.contains(indexedDbStores.exercises)) {
      const store = database.createObjectStore(indexedDbStores.exercises, {
        keyPath: 'key',
      });
      store.createIndex('by-user-due-date', ['userId', 'dueDate']);
      store.createIndex('by-user', 'userId');
    }

    if (!database.objectStoreNames.contains(indexedDbStores.statistics)) {
      const store = database.createObjectStore(indexedDbStores.statistics, {
        keyPath: 'key',
      });
      store.createIndex('by-user', 'userId');
    }
  },
};
