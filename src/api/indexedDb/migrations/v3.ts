import {indexedDbStores} from '@/api/indexedDb/stores';
import type {IndexedDbMigration} from '@/api/indexedDb/migrations/types';

export const migrationV3: IndexedDbMigration = {
  version: 3,
  up(database) {
    if (!database.objectStoreNames.contains(indexedDbStores.syncMetadata)) {
      database.createObjectStore(indexedDbStores.syncMetadata, {
        keyPath: 'key',
      });
    }
  },
};
