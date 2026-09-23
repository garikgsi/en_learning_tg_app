<template>
  <v-app>
    <router-view v-slot="{Component}">
      <component :is="activeLayout" :title="pageTitle">
        <component :is="Component"></component>
      </component>
    </router-view>
  </v-app>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, watch} from 'vue';
import {App as CapacitorApp, type AppState} from '@capacitor/app';
import {Capacitor, type PluginListenerHandle} from '@capacitor/core';
import {storeToRefs} from 'pinia';
import {useRoute, useRouter} from 'vue-router';
import {useTheme} from 'vuetify';
import MainLayout from '@/layouts/MainLayout.vue';
import UnsecureLayout from '@/layouts/UnsecureLayout.vue';
import {getRouteTitle, isPublicRoute} from '@/router/routeAccess';
import {useSettingsStore} from '@/stores/settingsStore';
import {useUserStore} from '@/stores/userStore';
import {useTranslateStore} from '@/stores/translateStore';
import {useNetwork} from '@/use/network';
import {useOfflineManager} from '@/use/offlineManager';
import {useAppUpdate} from '@/use/appUpdate';
import useMessages from '@/use/messages';
import {usePushNotifications} from '@/use/pushNotifications';
import {onAccessTokenRefreshed} from '@/use/authEvents';
import {useNotificationStore} from '@/stores/notificationStore';
import {useMonetizationStore} from '@/stores/monetizationStore';

const route = useRoute();
const router = useRouter();
const theme = useTheme();
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const translateStore = useTranslateStore();
const {isDarkTheme} = storeToRefs(settingsStore);
const {isInitialized, user} = storeToRefs(userStore);
const {activeExercise} = storeToRefs(translateStore);
const network = useNetwork();
const offlineManager = useOfflineManager();
const appUpdate = useAppUpdate();
const {add} = useMessages();
const notificationStore = useNotificationStore();
const monetizationStore = useMonetizationStore();
const pushNotifications = usePushNotifications();
let appStateListener: PluginListenerHandle | null = null;
let removeAccessTokenListener: (() => void) | null = null;

watch(isDarkTheme, (isDark) => {
  theme.global.name.value = isDark ? 'brandDark' : 'brandLight';
}, {immediate: true});

const activeLayout = computed(() => {
  return isPublicRoute(route.path) ? UnsecureLayout : MainLayout;
});

const pageTitle = computed(() => {
  if (!isInitialized.value) {
    return 'Восстановление сессии';
  }

  if (/^\/exercises\/\d+$/.test(route.path) && activeExercise.value) {
    if (activeExercise.value.type.name === 'daily') {
      return 'Перевод слов';
    }

    if (['plural', 'userPlural'].includes(activeExercise.value.type.name)) {
      return 'Множественное число';
    }

    if (activeExercise.value.type.name === 'weekly') {
      return 'Недельное упражнение';
    }

    if (activeExercise.value.type.name === 'user') {
      return 'Перевод слов';
    }

    return activeExercise.value.type.title || 'Упражнение';
  }

  return getRouteTitle(route.path);
});

const checkForAppUpdate = async (): Promise<void> => {
  const release = await appUpdate.check();

  if (release && route.path !== '/update') {
    await router.replace('/update');
  }
};

const synchronizeNotifications = async (): Promise<void> => {
  if (!user.value?.id || !network.isConnected.value) {
    return;
  }

  await Promise.all([
    notificationStore.synchronize(user.value.id),
    monetizationStore.synchronize().catch(() => undefined),
  ]);
};

const handleAppStateChange = (state: AppState): void => {
  if (state.isActive) {
    void synchronizeNotifications().catch(() => undefined);
  }
};

const handleVisibilityChange = (): void => {
  if (document.visibilityState === 'visible') {
    void synchronizeNotifications().catch(() => undefined);
  }
};

onMounted(async () => {
  await network.initialize();
  if (Capacitor.isNativePlatform()) {
    appStateListener = await CapacitorApp.addListener(
      'appStateChange',
      handleAppStateChange,
    );
  } else {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  removeAccessTokenListener = onAccessTokenRefreshed(() => {
    void synchronizeNotifications().catch(() => undefined);
  });
});

onUnmounted(() => {
  void appStateListener?.remove();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  removeAccessTokenListener?.();
  void pushNotifications.dispose();
});

watch(
  () => [
    user.value?.id,
    network.isConnected.value,
    network.isInitialized.value,
    userStore.isAdmin,
  ] as const,
  async (
    [userId, connected, networkInitialized, isAdmin],
    previousValues,
  ) => {
    const [
      previousUserId,
      previousConnected,
      wasNetworkInitialized,
      wasAdmin,
    ] = previousValues ?? [];
    if (userId !== previousUserId || !isAdmin) monetizationStore.reset();
    if (!userId || !networkInitialized) {
      return;
    }

    const shouldInitialize = userId !== previousUserId
      || isAdmin !== wasAdmin
      || wasNetworkInitialized !== true
      || (connected && previousConnected === false);

    if (shouldInitialize) {
      await Promise.allSettled([
        offlineManager.initializeForUser(userId, connected),
        notificationStore.loadCached(userId),
        connected ? checkForAppUpdate() : Promise.resolve(),
        connected ? synchronizeNotifications() : Promise.resolve(),
        connected
          ? pushNotifications.initializeForUser(
            userId,
            synchronizeNotifications,
            async path => {
              if (path === '/update') {
                await appUpdate.check({forceRefresh: true});
              }

              await router.push(path);
            },
          )
          : Promise.resolve(),
      ]);
    }
  },
  {immediate: true},
);

watch(network.isConnected, (connected, wasConnected) => {
  if (
    network.isInitialized.value
    && connected
    && wasConnected === false
  ) {
    add('Соединение с интернетом восстановлено', 3);
  }
});
</script>
