import {openDB, type IDBPDatabase, type StoreNames} from 'idb';
import {
  indexedDbDatabaseVersion,
  getIndexedDbMigrations,
} from '@/api/indexedDb/migrator';
import {
  indexedDbStores,
  type IndexedDbStore,
} from '@/api/indexedDb/stores';

export {indexedDbDatabaseVersion, indexedDbStores};
export type {IndexedDbStore};

export type IndexedDbMutation<T> =
  | {type: 'put', value: T}
  | {type: 'delete', key: IDBValidKey};

export type IndexedDbStoreMutation =
  | {store: IndexedDbStore, type: 'put', value: unknown}
  | {store: IndexedDbStore, type: 'delete', key: IDBValidKey};

const databaseName = 'en-learning';

let databasePromise: Promise<IDBPDatabase> | null = null;

const openDatabase = (): Promise<IDBPDatabase> => {
  databasePromise ??= openDB(databaseName, indexedDbDatabaseVersion, {
    upgrade(database, oldVersion) {
      for (const migration of getIndexedDbMigrations(oldVersion)) {
        migration.up(database);
      }
    },
  });

  return databasePromise;
}

export class IndexedDbClient {
  async get<T>(store: IndexedDbStore, key: IDBValidKey): Promise<T | undefined> {
    return (await openDatabase()).get(store, key) as Promise<T | undefined>;
  }

  async getAll<T>(store: IndexedDbStore): Promise<T[]> {
    return (await openDatabase()).getAll(store) as Promise<T[]>;
  }

  async getAllFromIndex<T>(
    store: IndexedDbStore,
    index: string,
    query?: IDBValidKey | IDBKeyRange,
  ): Promise<T[]> {
    return (await openDatabase()).getAllFromIndex(
      store,
      index,
      query,
    ) as Promise<T[]>;
  }

  async put<T>(store: IndexedDbStore, value: T): Promise<void> {
    await (await openDatabase()).put(store, value);
  }

  async delete(store: IndexedDbStore, key: IDBValidKey): Promise<void> {
    await (await openDatabase()).delete(store, key);
  }

  async clear(store: IndexedDbStore): Promise<void> {
    await (await openDatabase()).clear(store);
  }

  async mutate<T>(
    store: IndexedDbStore,
    mutations: IndexedDbMutation<T>[],
  ): Promise<void> {
    const database = await openDatabase();
    const transaction = database.transaction(
      store as StoreNames<unknown>,
      'readwrite',
    );

    for (const mutation of mutations) {
      if (mutation.type === 'put') {
        await transaction.store.put(mutation.value);
      } else {
        await transaction.store.delete(mutation.key);
      }
    }

    await transaction.done;
  }

  async mutateStores(mutations: IndexedDbStoreMutation[]): Promise<void> {
    if (mutations.length === 0) {
      return;
    }

    const database = await openDatabase();
    const stores = [...new Set(mutations.map(mutation => mutation.store))];
    const transaction = database.transaction(
      stores as StoreNames<unknown>[],
      'readwrite',
    );

    for (const mutation of mutations) {
      const store = transaction.objectStore(
        mutation.store as StoreNames<unknown>,
      );

      if (mutation.type === 'put') {
        await store.put(mutation.value);
      } else {
        await store.delete(mutation.key);
      }
    }

    await transaction.done;
  }
}

export const indexedDb = new IndexedDbClient();

export const resetIndexedDbConnection = (): void => {
  databasePromise = null;
}
