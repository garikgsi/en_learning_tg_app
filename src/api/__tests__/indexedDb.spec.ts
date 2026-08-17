import {describe, expect, it} from 'vitest';
import {
  indexedDb,
  indexedDbDatabaseVersion,
  indexedDbStores,
} from '@/api/indexedDb';
import {getIndexedDbMigrations} from '@/api/indexedDb/migrator';

describe('IndexedDB migrations', () => {
  it.each([
    {currentVersion: 0, expectedVersions: [1, 2, 3]},
    {currentVersion: 1, expectedVersions: [2, 3]},
    {currentVersion: 2, expectedVersions: [3]},
    {currentVersion: 3, expectedVersions: []},
  ])(
    'returns migrations after version $currentVersion',
    ({currentVersion, expectedVersions}) => {
      expect(
        getIndexedDbMigrations(currentVersion).map(migration => migration.version),
      ).toEqual(expectedVersions);
    },
  );

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
