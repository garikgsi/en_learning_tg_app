<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {Capacitor} from '@capacitor/core';
import {useRouter} from 'vue-router';
import logoUrl from '@/assets/logo.svg';
import {indexedDbDatabaseVersion} from '@/api/indexedDb';
import {useAppUpdate} from '@/use/appUpdate';
import useMessages from '@/use/messages.ts';

const router = useRouter();
const appUpdate = useAppUpdate();
const {add, addError} = useMessages();
const checkResult = ref<'current' | null>(null);

const appVersion = computed(() => {
  if (appUpdate.installedVersion.value) {
    return appUpdate.installedVersion.value.versionName;
  }

  return Capacitor.isNativePlatform() ? 'Определяется…' : 'Веб-версия';
});

const versionCode = computed(() => {
  return appUpdate.installedVersion.value?.versionCode ?? null;
});

const checkForUpdates = async (): Promise<void> => {
  checkResult.value = null;
  const release = await appUpdate.check({forceRefresh: true});

  if (release) {
    await router.replace('/update');
    return;
  }

  if (appUpdate.checkError.value) {
    addError(appUpdate.checkError.value);
    return;
  }

  if (!appUpdate.checkError.value) {
    add('Установлена последняя версия приложения');
    return;
  }
};

onMounted(async () => {
  await appUpdate.loadInstalledVersion().catch(() => undefined);
});
</script>

<template>
  <v-card class="about-card mx-auto" max-width="640">
    <v-card-text class="text-center">
      <v-img
        :src="logoUrl"
        alt="English Learning"
        class="about-card__logo mx-auto mb-5"
        width="120"
      ></v-img>

      <h1 class="text-h5 mb-3">English Learning</h1>
      <p class="text-body-1 text-medium-emphasis mb-6">
        Пополните свой словарный запас за 5 минут в день!
      </p>

      <v-list class="about-card__versions" lines="one">
        <v-list-item prepend-icon="mdi-cellphone">
          <v-list-item-title>Версия приложения</v-list-item-title>
          <template #append>
            <span>{{ appVersion }}</span>
            <span v-if="versionCode" class="text-medium-emphasis ml-1">
              ({{ versionCode }})
            </span>
          </template>
        </v-list-item>

        <v-list-item prepend-icon="mdi-database-outline">
          <v-list-item-title>Версия базы данных</v-list-item-title>
          <template #append>{{ indexedDbDatabaseVersion }}</template>
        </v-list-item>
      </v-list>

    </v-card-text>

    <v-card-actions class="about-card__actions">
      <v-btn
        color="primary"
        :loading="appUpdate.isChecking.value"
        prepend-icon="mdi-update"
        variant="flat"
        @click="checkForUpdates"
      >
        Проверить обновление
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.about-card__logo {
  border-radius: 28px;
}

.about-card__versions {
  background: transparent;
  text-align: left;
}

.about-card__actions {
  justify-content: center;
  padding: 0 24px 24px;
}

@media (max-width: 420px) {
  .about-card__actions > :deep(.v-btn) {
    width: 100%;
  }
}
</style>
