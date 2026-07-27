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
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';
import UnsecureLayout from '@/layouts/UnsecureLayout.vue';
import {getRouteTitle, isPublicRoute} from '@/router/routeAccess';

const route = useRoute();

const activeLayout = computed(() => {
  return isPublicRoute(route.path) ? UnsecureLayout : MainLayout;
});

const pageTitle = computed(() => getRouteTitle(route.path));
</script>
