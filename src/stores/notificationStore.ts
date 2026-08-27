import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import type {UserNotification} from '@/api/types/notification';
import {useNotificationRepository} from '@/use/notificationRepository';

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<UserNotification[]>([]);
  const isSynchronizing = ref(false);
  const activeUserId = ref<string | null>(null);
  const repository = useNotificationRepository();

  const unreadCount = computed(() => {
    return items.value.filter(item => item.readAt === null).length;
  });

  const loadCached = async (userId: string): Promise<void> => {
    activeUserId.value = userId;
    items.value = await repository.getCached(userId);
  };

  const synchronize = async (userId: string): Promise<void> => {
    activeUserId.value = userId;
    isSynchronizing.value = true;

    try {
      await repository.synchronize(userId);
      items.value = await repository.getCached(userId);
    } finally {
      isSynchronizing.value = false;
    }
  };

  const markRead = async (notificationId: string): Promise<void> => {
    if (!activeUserId.value) {
      return;
    }

    await repository.markRead(activeUserId.value, notificationId);
    items.value = await repository.getCached(activeUserId.value);
  };

  return {
    items,
    isSynchronizing,
    unreadCount,
    loadCached,
    synchronize,
    markRead,
  };
});
