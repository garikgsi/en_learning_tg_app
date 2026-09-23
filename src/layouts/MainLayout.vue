<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useDisplay} from 'vuetify';
import {routes} from '@/router/routeAccess';
import {useNotificationStore} from '@/stores/notificationStore';
import {useMonetizationStore} from '@/stores/monetizationStore';
import {useUserStore} from '@/stores/userStore';
import IThemeToggle from '@/components/IThemeToggle.vue';
import useLoading from '@/use/loading';
import IMessage from "@/components/IMessage.vue";
import {useOfflineManager} from '@/use/offlineManager';
import useMessages from '@/use/messages';
import {messageKeys} from '@/use/messageKeys';
import type {Message} from '@/use/types/messages';

const {isLoading} = useLoading();
const userStore = useUserStore();
const {user} = storeToRefs(userStore);
const notificationStore = useNotificationStore();
const {unreadCount} = storeToRefs(notificationStore);
const {pendingCount} = storeToRefs(useMonetizationStore());
const offlineManager = useOfflineManager();
const {pendingResults, failedResults} = offlineManager;
const {addError, addWarning, readMessageByKey} = useMessages();

const runMessageAction = (
  message: Message,
  runAction: (message: Message) => Promise<void>,
): void => {
  void runAction(message);
};

watch(
  () => [pendingResults.value, failedResults.value] as const,
  ([pending, failed]) => {
    if (failed > 0) {
      addError(
        `${failed} результатов не удалось отправить автоматически.`,
        0,
        {key: messageKeys.failedResults},
      );
    } else {
      readMessageByKey(messageKeys.failedResults);
    }

    if (pending > 0) {
      addWarning(
        `${pending} результатов ожидают отправки.`,
        0,
        {
          key: messageKeys.pendingResults,
          action: {
            title: 'Обновить',
            handler: async () => {
              if (user.value?.id) {
                await offlineManager.sync(user.value.id);
              }
            },
          },
        },
      );
    } else {
      readMessageByKey(messageKeys.pendingResults);
    }
  },
  {immediate: true},
);

type Props = {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Перевод слов',
});

const {smAndDown} = useDisplay();

const drawer = ref(true);
const rail = ref(true);

watch(smAndDown, (isSmallScreen) => {
  drawer.value = !isSmallScreen;
  rail.value = !isSmallScreen;
}, {immediate: true});

const accountAvatar = computed(() => {
  return user.value?.avatar;
});

const accountName = computed(() => user.value?.name ?? 'Гость');
const accountInitial = computed(() => {
  return accountName.value.trim().charAt(0).toUpperCase();
});
const accountSubtitle = computed(() => user.value?.phone ?? 'Войти');

const menuItems = computed(() => Object.entries(routes)
  .filter(([, route]) => route.showInSideBar && (!route.adminOnly || userStore.isAdmin))
  .map(([to, route]) => ({
    text: route.title,
    icon: route.icon,
    to,
    badgeCount: to === '/notifications' ? unreadCount.value : to === '/monetization-requests' ? pendingCount.value : 0,
    badgeLabel: to === '/monetization-requests' ? 'Необработанных запросов: {0}' : 'Непрочитанных уведомлений: {0}',
  })));

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

  <IMessage>
    <template #append="{message, runAction, isActionLoading}">
      <v-btn
        v-if="message.action"
        :loading="isActionLoading"
        :title="message.action.title"
        variant="tonal"
        @click="runMessageAction(message, runAction)"
      >
        {{ message.action.title }}
      </v-btn>
    </template>
  </IMessage>

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

    <template #append>
      <IThemeToggle></IThemeToggle>
    </template>

    <v-progress-linear
      :active="isLoading"
      :indeterminate="isLoading"
      color="primary"
      location="bottom"
      absolute
    ></v-progress-linear>

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
        @click.stop
      >
        <v-avatar
          color="primary"
          size="40"
        >
          <v-img
            v-if="accountAvatar"
            :src="accountAvatar"
            cover
          ></v-img>
          <span v-else>{{ accountInitial }}</span>
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
          >
            <v-img
              v-if="accountAvatar"
              :src="accountAvatar"
              cover
            ></v-img>
            <span v-else>{{ accountInitial }}</span>
          </v-avatar>
        </template>

        <template #append>
          <v-btn
            v-if="!smAndDown && !rail"
            aria-label="Свернуть меню"
            icon="mdi-chevron-left"
            size="small"
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
        :title="item.text"
        :to="item.to"
        color="primary"
        @click="closeMenuOnSmallScreen"
      >
        <template #prepend>
          <v-badge
            :content="item.badgeCount"
            :max="99"
            :model-value="item.badgeCount > 0"
            bordered
            color="error"
            :label="item.badgeLabel"
          >
            <v-icon :icon="item.icon"></v-icon>
          </v-badge>
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>

  <v-main>


    <v-container class="py-6" fluid>

      <slot></slot>

    </v-container>

  </v-main>
</template>
