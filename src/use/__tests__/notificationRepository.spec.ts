import {beforeEach, describe, expect, it, vi} from 'vitest';
import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import {httpNotificationDriver} from '@/api/http/notification';
import {useNotificationRepository} from '@/use/notificationRepository';
import type {UserNotification} from '@/api/types/notification';

const notification = (id: string, sequence: number): UserNotification => ({
  id,
  sequence,
  type: 'exercise.created',
  title: `Уведомление ${sequence}`,
  body: 'Новое упражнение готово',
  data: {route: `/exercises/${sequence}`},
  createdAt: `2026-08-27T10:00:0${sequence}Z`,
  readAt: null,
});

describe('notificationRepository', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      indexedDb.clear(indexedDbStores.notifications),
      indexedDb.clear(indexedDbStores.syncMetadata),
    ]);
  });

  it('downloads every delta page and resumes from the saved sequence', async () => {
    const synchronize = vi.spyOn(httpNotificationDriver, 'synchronize')
      .mockResolvedValueOnce({
        items: [notification('first', 1)],
        nextSequence: 1,
        hasMore: true,
        unreadCount: 2,
      })
      .mockResolvedValueOnce({
        items: [notification('second', 2)],
        nextSequence: 2,
        hasMore: false,
        unreadCount: 2,
      })
      .mockResolvedValueOnce({
        items: [],
        nextSequence: 2,
        hasMore: false,
        unreadCount: 2,
      });
    const repository = useNotificationRepository();

    await repository.synchronize('user-1');
    await repository.synchronize('user-1');
    const cached = await repository.getCached('user-1');

    expect(synchronize.mock.calls).toEqual([
      [0],
      [1],
      [2],
    ]);
    expect(cached.map(item => item.id)).toEqual(['second', 'first']);
  });

  it('updates the cached read state from the server response', async () => {
    const readNotification = {
      ...notification('read-id', 5),
      readAt: '2026-08-27T11:00:00Z',
    };
    vi.spyOn(httpNotificationDriver, 'markRead')
      .mockResolvedValue(readNotification);

    await useNotificationRepository().markRead(
      'user-read',
      readNotification.id,
    );
    const cached = await useNotificationRepository().getCached('user-read');

    expect(cached).toEqual([readNotification]);
  });
});
