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
import {computed, onMounted, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useRoute} from 'vue-router';
import {useTheme} from 'vuetify';
import MainLayout from '@/layouts/MainLayout.vue';
import UnsecureLayout from '@/layouts/UnsecureLayout.vue';
import {getRouteTitle, isPublicRoute} from '@/router/routeAccess';
import {useSettingsStore} from '@/stores/settingsStore';
import {useUserStore} from '@/stores/userStore';
import {useNetwork} from '@/use/network';
import {useOfflineManager} from '@/use/offlineManager';
import {useAppUpdate} from '@/use/appUpdate';
import useMessages from '@/use/messages';

const route = useRoute();
const theme = useTheme();
const settingsStore = useSettingsStore();
const userStore = useUserStore();
const {isDarkTheme} = storeToRefs(settingsStore);
const {user} = storeToRefs(userStore);
const network = useNetwork();
const offlineManager = useOfflineManager();
const appUpdate = useAppUpdate();
const {add} = useMessages();

watch(isDarkTheme, (isDark) => {
  theme.global.name.value = isDark ? 'brandDark' : 'brandLight';
}, {immediate: true});

const activeLayout = computed(() => {
  return isPublicRoute(route.path) ? UnsecureLayout : MainLayout;
});

const pageTitle = computed(() => getRouteTitle(route.path));

onMounted(async () => {
  await network.initialize();
});

watch(
  () => [
    user.value?.id,
    network.isConnected.value,
    network.isInitialized.value,
  ] as const,
  async (
    [userId, connected, networkInitialized],
    previousValues,
  ) => {
    const [
      previousUserId,
      previousConnected,
      wasNetworkInitialized,
    ] = previousValues ?? [];
    if (!userId || !networkInitialized) {
      return;
    }

    const shouldInitialize = userId !== previousUserId
      || wasNetworkInitialized !== true
      || (connected && previousConnected === false);

    if (shouldInitialize) {
      await Promise.allSettled([
        offlineManager.initializeForUser(userId, connected),
        connected ? appUpdate.check() : Promise.resolve(),
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
