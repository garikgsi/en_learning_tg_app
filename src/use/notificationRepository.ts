import {httpNotificationDriver} from '@/api/http/notification';
import {indexedDbNotificationDriver} from '@/api/indexedDb/notification';
import type {UserNotification} from '@/api/types/notification';

const synchronizationRequests = new Map<string, Promise<void>>();

const synchronize = async (userId: string): Promise<void> => {
  const existing = synchronizationRequests.get(userId);

  if (existing) {
    return existing;
  }

  const request = (async () => {
    const metadata = await indexedDbNotificationDriver.getMetadata(userId);
    let afterSequence = metadata?.nextSequence ?? 0;
    let hasMore = true;

    while (hasMore) {
      const response = await httpNotificationDriver.synchronize(afterSequence);

      if (
        response.nextSequence < afterSequence
        || (response.hasMore && response.nextSequence === afterSequence)
      ) {
        throw new Error('Сервер вернул некорректный курсор уведомлений');
      }

      await indexedDbNotificationDriver.saveSynchronization(userId, response);
      afterSequence = response.nextSequence;
      hasMore = response.hasMore;
    }
  })().finally(() => synchronizationRequests.delete(userId));

  synchronizationRequests.set(userId, request);

  return request;
};

const repository = {
  synchronize,

  getCached(userId: string): Promise<UserNotification[]> {
    return indexedDbNotificationDriver.getAll(userId);
  },

  async markRead(
    userId: string,
    notificationId: string,
  ): Promise<UserNotification> {
    const notification = await httpNotificationDriver.markRead(notificationId);
    await indexedDbNotificationDriver.put(userId, notification);

    return notification;
  },

  async markAllRead(userId: string): Promise<void> {
    const {readAt} = await httpNotificationDriver.markAllRead();
    const notifications = await indexedDbNotificationDriver.getAll(userId);

    await Promise.all(notifications.map(notification => (
      indexedDbNotificationDriver.put(userId, {
        ...notification,
        readAt: notification.readAt ?? readAt,
      })
    )));
  },
};

export const useNotificationRepository = () => repository;
