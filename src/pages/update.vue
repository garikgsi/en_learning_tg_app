<script setup lang="ts">
import {computed} from 'vue';
import {useRouter} from 'vue-router';
import {useAppUpdate} from '@/use/appUpdate';

const router = useRouter();
const appUpdate = useAppUpdate();

const release = computed(() => appUpdate.availableRelease.value);

const formattedSize = computed(() => {
  if (!release.value?.size) {
    return null;
  }

  return `${(release.value.size / 1024 / 1024).toFixed(1)} МБ`;
});

const install = async (): Promise<void> => {
  if (release.value) {
    await appUpdate.install(release.value);
  }
};

const postpone = async (): Promise<void> => {
  await router.replace('/');
};
</script>

<template>
  <v-card class="update-card mx-auto" max-width="640">
    <div class="update-card__hero">
      <v-icon
        color="secondary"
        icon="mdi-cellphone-arrow-down"
        size="72"
      ></v-icon>
    </div>

    <template v-if="release">
      <v-card-title class="text-h5 text-center">
        Доступно обновление
      </v-card-title>

      <v-card-subtitle class="text-center">
        Версия {{ release.versionName }}
        <template v-if="formattedSize"> · {{ formattedSize }}</template>
      </v-card-subtitle>

      <v-card-text>
        <p v-if="release.releaseNotes" class="update-card__notes">
          {{ release.releaseNotes }}
        </p>
        <p v-else class="text-medium-emphasis text-center">
          Мы улучшили приложение и исправили мелкие ошибки.
        </p>

        <v-alert
          v-if="appUpdate.installationError.value"
          class="mt-5"
          type="error"
          variant="tonal"
        >
          {{ appUpdate.installationError.value }}
        </v-alert>

        <v-alert
          v-if="release.mandatory"
          class="mt-5"
          type="info"
          variant="tonal"
        >
          Это обновление необходимо для продолжения работы.
        </v-alert>
      </v-card-text>

      <v-card-actions class="update-card__actions">
        <v-btn
          v-if="!release.mandatory"
          :disabled="appUpdate.isDownloading.value"
          @click="postpone"
        >
          Позже
        </v-btn>
        <v-btn
          color="primary"
          :loading="appUpdate.isDownloading.value"
          prepend-icon="mdi-download"
          variant="flat"
          @click="install"
        >
          Скачать и установить
        </v-btn>
      </v-card-actions>
    </template>

    <template v-else>
      <v-card-title class="text-h5 text-center">
        Обновление приложения
      </v-card-title>
      <v-card-text class="text-medium-emphasis text-center">
        Информация об обновлении пока недоступна.
      </v-card-text>
      <v-card-actions class="update-card__actions">
        <v-btn prepend-icon="mdi-arrow-left" to="/">
          Вернуться
        </v-btn>
      </v-card-actions>
    </template>
  </v-card>
</template>

<style scoped>
.update-card {
  overflow: hidden;
}

.update-card__hero {
  display: flex;
  justify-content: center;
  padding: 40px 24px 16px;
  background: rgb(var(--v-theme-secondary), 0.08);
}

.update-card__notes {
  margin: 8px 0 0;
  white-space: pre-line;
  text-align: center;
}

.update-card__actions {
  flex-wrap: wrap-reverse;
  justify-content: center;
  gap: 12px;
  padding: 8px 24px 24px;
}

@media (max-width: 420px) {
  .update-card__actions > :deep(.v-btn) {
    width: 100%;
  }
}
</style>
