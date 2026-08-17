import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import type {UserInfo} from '@/api/types/user';

type CachedUser = {
  userId: string
  cachedAt: string
  user: UserInfo
}

export const indexedDbUserDriver = {
  async save(user: UserInfo): Promise<void> {
    await indexedDb.put(indexedDbStores.users, {
      userId: user.id,
      cachedAt: new Date().toISOString(),
      user,
    } satisfies CachedUser);
  },

  async get(userId: string): Promise<UserInfo | null> {
    const cached = await indexedDb.get<CachedUser>(
      indexedDbStores.users,
      userId,
    );

    return cached?.user ?? null;
  },

  async remove(userId: string): Promise<void> {
    await indexedDb.delete(indexedDbStores.users, userId);
  },
};
