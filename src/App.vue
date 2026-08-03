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
import {computed, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useRoute} from 'vue-router';
import {useTheme} from 'vuetify';
import MainLayout from '@/layouts/MainLayout.vue';
import UnsecureLayout from '@/layouts/UnsecureLayout.vue';
import {getRouteTitle, isPublicRoute} from '@/router/routeAccess';
import {useSettingsStore} from '@/stores/settingsStore';

const route = useRoute();
const theme = useTheme();
const settingsStore = useSettingsStore();
const {isDarkTheme} = storeToRefs(settingsStore);

watch(isDarkTheme, (isDark) => {
  theme.global.name.value = isDark ? 'brandDark' : 'brandLight';
}, {immediate: true});

const activeLayout = computed(() => {
  return isPublicRoute(route.path) ? UnsecureLayout : MainLayout;
});

const pageTitle = computed(() => getRouteTitle(route.path));
</script>
