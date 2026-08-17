import {openDB, type IDBPDatabase, type StoreNames} from 'idb';

export const indexedDbStores = {
  exercises: 'exercises',
  statistics: 'statistics',
  completionOutbox: 'completionOutbox',
  users: 'users',
  dictionaryWords: 'dictionaryWords',
  dictionaryMetadata: 'dictionaryMetadata',
  syncMetadata: 'syncMetadata',
} as const;

export type IndexedDbStore = typeof indexedDbStores[keyof typeof indexedDbStores];

const databaseName = 'en-learning';
export const indexedDbDatabaseVersion = 3;

type IndexedDbMigration = (database: IDBPDatabase) => void;

const migrations: Record<number, IndexedDbMigration> = {
  1(database) {
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
  2(database) {
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
  3(database) {
    if (!database.objectStoreNames.contains(indexedDbStores.syncMetadata)) {
      database.createObjectStore(indexedDbStores.syncMetadata, {
        keyPath: 'key',
      });
    }
  },
};

let databasePromise: Promise<IDBPDatabase> | null = null;

const openDatabase = (): Promise<IDBPDatabase> => {
  databasePromise ??= openDB(databaseName, indexedDbDatabaseVersion, {
    upgrade(database, oldVersion) {
      for (
        let version = oldVersion + 1;
        version <= indexedDbDatabaseVersion;
        version++
      ) {
        migrations[version]?.(database);
      }
    },
  });

  return databasePromise;
}

export type IndexedDbMutation<T> =
  | {type: 'put', value: T}
  | {type: 'delete', key: IDBValidKey};

export type IndexedDbStoreMutation =
  | {store: IndexedDbStore, type: 'put', value: unknown}
  | {store: IndexedDbStore, type: 'delete', key: IDBValidKey};

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
