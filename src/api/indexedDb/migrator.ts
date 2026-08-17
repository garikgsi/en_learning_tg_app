import {migrationV1} from '@/api/indexedDb/migrations/v1';
import {migrationV2} from '@/api/indexedDb/migrations/v2';
import {migrationV3} from '@/api/indexedDb/migrations/v3';
import type {IndexedDbMigration} from '@/api/indexedDb/migrations/types';

const migrations: IndexedDbMigration[] = [
  migrationV1,
  migrationV2,
  migrationV3,
].sort((left, right) => left.version - right.version);

export const indexedDbDatabaseVersion = migrations.at(-1)?.version ?? 0;

export const getIndexedDbMigrations = (
  currentVersion: number,
): IndexedDbMigration[] => {
  return migrations.filter(migration => migration.version > currentVersion);
};
