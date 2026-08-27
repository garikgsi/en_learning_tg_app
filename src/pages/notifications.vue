<script setup lang="ts">
import {onMounted} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import {useUserStore} from '@/stores/userStore';
import {useNotificationStore} from '@/stores/notificationStore';
import {useNetwork} from '@/use/network';
import {useAppUpdate} from '@/use/appUpdate';
import type {UserNotification} from '@/api/types/notification';

const router = useRouter();
const userStore = useUserStore();
const notificationStore = useNotificationStore();
const {user} = storeToRefs(userStore);
const {items, isSynchronizing} = storeToRefs(notificationStore);
const {isConnected} = useNetwork();
const appUpdate = useAppUpdate();

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const refresh = async (): Promise<void> => {
  if (user.value?.id && isConnected.value) {
    await notificationStore.synchronize(user.value.id);
  }
};

const openNotification = async (
  notification: UserNotification,
): Promise<void> => {
  if (notification.readAt === null && isConnected.value) {
    await notificationStore.markRead(notification.id).catch(() => undefined);
  }

  const route = notification.data.route;

  if (typeof route === 'string' && route.startsWith('/')) {
    if (route === '/update' && isConnected.value) {
      await appUpdate.check({forceRefresh: true});
    }

    await router.push(route);
  }
};

onMounted(async () => {
  if (!user.value?.id) {
    return;
  }

  await notificationStore.loadCached(user.value.id);
  await refresh().catch(() => undefined);
});
</script>

<template>
  <v-card class="mx-auto" max-width="760">
    <v-card-title class="notifications-title">
      <span>Уведомления</span>
      <v-btn
        aria-label="Обновить уведомления"
        :disabled="!isConnected"
        :loading="isSynchronizing"
        icon="mdi-refresh"
        variant="text"
        @click="refresh"
      />
    </v-card-title>

    <v-divider />

    <v-list v-if="items.length > 0" lines="three">
      <template v-for="(notification, index) in items" :key="notification.id">
        <v-list-item
          :class="{'notification--unread': notification.readAt === null}"
          :subtitle="notification.body"
          :title="notification.title"
          @click="openNotification(notification)"
        >
          <template #prepend>
            <v-icon
              :color="notification.readAt === null ? 'primary' : undefined"
              :icon="notification.type === 'app.release.available'
                ? 'mdi-cellphone-arrow-down'
                : 'mdi-bell-outline'"
            />
          </template>
          <template #append>
            <span class="notification-date">
              {{ formatDate(notification.createdAt) }}
            </span>
          </template>
        </v-list-item>
        <v-divider v-if="index < items.length - 1" />
      </template>
    </v-list>

    <v-card-text v-else class="text-medium-emphasis text-center py-10">
      Уведомлений пока нет
    </v-card-text>
  </v-card>
</template>

<style scoped>
.notifications-title {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.notification--unread {
  background: rgb(var(--v-theme-primary), 0.06);
}

.notification-date {
  color: rgb(var(--v-theme-on-surface), 0.6);
  font-size: 0.75rem;
  max-width: 110px;
  text-align: right;
}

@media (max-width: 420px) {
  .notification-date {
    max-width: 72px;
  }
}
</style>
