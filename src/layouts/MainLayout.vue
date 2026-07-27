<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useDisplay} from 'vuetify';
import {routes} from '@/router/routeAccess';
import {useUserStore} from '@/stores/userStore';

type Props = {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Перевод слов',
});

const {smAndDown} = useDisplay();
const userStore = useUserStore();
const {user} = storeToRefs(userStore);

const drawer = ref(true);
const rail = ref(true);

watch(smAndDown, (isSmallScreen) => {
  drawer.value = !isSmallScreen;
  rail.value = !isSmallScreen;
}, {immediate: true});

const accountAvatar = computed(() => {
  return user.value?.avatar ?? '';
});

const accountName = computed(() => user.value?.name ?? 'Гость');
const accountInitial = computed(() => {
  return accountName.value.trim().charAt(0).toUpperCase();
});
const accountSubtitle = computed(() => user.value?.phone ?? 'Войти');

const menuItems = Object.entries(routes)
  .filter(([, route]) => route.showInSideBar)
  .map(([to, route]) => ({
    text: route.title,
    icon: route.icon,
    to,
  }));

const expandRail = () => {
  if (!smAndDown.value) {
    rail.value = false;
  }
}

const closeMenuOnSmallScreen = () => {
  if (smAndDown.value) {
    drawer.value = false;
  }
}
</script>

<template>
  <v-app-bar v-if="smAndDown">
    <template #prepend>
      <v-app-bar-nav-icon
        aria-label="Открыть меню"
        @click="drawer = !drawer"
      ></v-app-bar-nav-icon>
    </template>

    <v-app-bar-title>
      <slot name="title">{{ title }}</slot>
    </v-app-bar-title>
  </v-app-bar>

  <v-navigation-drawer
    v-model="drawer"
    :permanent="!smAndDown"
    :rail="!smAndDown && rail"
    :temporary="smAndDown"
    @click="expandRail"
  >
    <v-list
      v-if="!smAndDown && rail"
      class="d-flex justify-center py-2"
    >
      <v-btn
        aria-label="Открыть профиль"
        icon
        size="48"
        to="/profile"
        variant="text"
        @click.stop
      >
        <v-avatar
          color="primary"
          :image="accountAvatar || undefined"
          size="40"
        >
          <span v-if="!accountAvatar">{{ accountInitial }}</span>
        </v-avatar>
      </v-btn>
    </v-list>

    <v-list v-else>
      <v-list-item
        nav
        :subtitle="accountSubtitle"
        :title="accountName"
        to="/profile"
        @click="closeMenuOnSmallScreen"
      >
        <template #prepend>
          <v-avatar
            color="primary"
            :image="accountAvatar || undefined"
          >
            <span v-if="!accountAvatar">{{ accountInitial }}</span>
          </v-avatar>
        </template>

        <template #append>
          <v-btn
            v-if="!smAndDown && !rail"
            aria-label="Свернуть меню"
            icon="mdi-chevron-left"
            size="small"
            variant="text"
            @click.stop="rail = true"
          ></v-btn>
        </template>
      </v-list-item>
    </v-list>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item
        v-for="item in menuItems"
        :key="item.to"
        :prepend-icon="item.icon"
        :title="item.text"
        :to="item.to"
        color="primary"
        @click="closeMenuOnSmallScreen"
      ></v-list-item>
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <v-container class="py-6" fluid>
      <slot></slot>
    </v-container>
  </v-main>
</template>
