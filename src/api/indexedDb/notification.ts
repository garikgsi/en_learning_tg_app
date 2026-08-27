import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import type {
  CachedUserNotification,
  NotificationSyncMetadata,
  NotificationSyncResponse,
  UserNotification,
} from '@/api/types/notification';

const notificationKey = (userId: string, id: string): string => {
  return `${userId}:${id}`;
};

const metadataKey = (userId: string): string => {
  return `notifications:${userId}`;
};

export const indexedDbNotificationDriver = {
  getMetadata(userId: string): Promise<NotificationSyncMetadata | undefined> {
    return indexedDb.get<NotificationSyncMetadata>(
      indexedDbStores.syncMetadata,
      metadataKey(userId),
    );
  },

  async saveSynchronization(
    userId: string,
    response: NotificationSyncResponse,
  ): Promise<void> {
    const metadata: NotificationSyncMetadata = {
      key: metadataKey(userId),
      userId,
      nextSequence: response.nextSequence,
      unreadCount: response.unreadCount,
      synchronizedAt: new Date().toISOString(),
    };

    await indexedDb.mutateStores([
      ...response.items.map(notification => ({
        store: indexedDbStores.notifications,
        type: 'put' as const,
        value: {
          ...notification,
          key: notificationKey(userId, notification.id),
          userId,
        } satisfies CachedUserNotification,
      })),
      {
        store: indexedDbStores.syncMetadata,
        type: 'put',
        value: metadata,
      },
    ]);
  },

  async getAll(userId: string): Promise<UserNotification[]> {
    const cached = await indexedDb.getAllFromIndex<CachedUserNotification>(
      indexedDbStores.notifications,
      'by-user',
      userId,
    );

    return cached
      .sort((left, right) => right.sequence - left.sequence)
      .map(({key: _key, userId: _userId, ...notification}) => notification);
  },

  async put(userId: string, notification: UserNotification): Promise<void> {
    await indexedDb.put(indexedDbStores.notifications, {
      ...notification,
      key: notificationKey(userId, notification.id),
      userId,
    } satisfies CachedUserNotification);
  },
};
