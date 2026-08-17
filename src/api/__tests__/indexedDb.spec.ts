import {describe, expect, it} from 'vitest';
import {
  indexedDb,
  indexedDbDatabaseVersion,
  indexedDbStores,
} from '@/api/indexedDb';

describe('IndexedDB migrations', () => {
  it('applies every schema migration and creates the metadata store', async () => {
    const metadata = {
      key: 'test:migration',
      version: indexedDbDatabaseVersion,
    };

    await indexedDb.put(indexedDbStores.syncMetadata, metadata);

    expect(indexedDbDatabaseVersion).toBe(3);
    expect(await indexedDb.get(
      indexedDbStores.syncMetadata,
      metadata.key,
    )).toEqual(metadata);
  });
});
