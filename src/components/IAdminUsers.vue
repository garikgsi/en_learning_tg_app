<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {httpAdminExerciseDriver} from '@/api/http/adminExercise';
import type {AssignmentUser} from '@/api/http/adminExercise';
import {getApiErrorMessage} from '@/api/errors';
import {useUserStore} from '@/stores/userStore';
import {useNetwork} from '@/use/network';

const userStore = useUserStore();
const {isConnected} = useNetwork();
const users = ref<AssignmentUser[]>([]);
const isLoading = ref(false);
const error = ref('');

const userInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

const load = async (): Promise<void> => {
  if (!userStore.isAdmin) return;

  isLoading.value = true;
  error.value = '';

  try {
    users.value = await httpAdminExerciseDriver.getUsers();
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Не удалось загрузить пользователей');
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="admin-users mx-auto">
    <v-alert v-if="!userStore.isAdmin" type="error" variant="tonal">
      Страница доступна только администраторам.
    </v-alert>

    <template v-else>
      <div class="d-flex align-center justify-space-between mb-5">
        <h1 class="text-h5">Пользователи</h1>
        <v-btn
          aria-label="Обновить список пользователей"
          :disabled="!isConnected"
          :loading="isLoading"
          icon="mdi-refresh"
          variant="text"
          @click="load"
        />
      </div>

      <v-alert v-if="error" class="mb-4" type="error" variant="tonal">
        {{ error }}
      </v-alert>

      <v-progress-linear v-if="isLoading" class="mb-3" color="primary" indeterminate />

      <v-card v-if="users.length > 0" variant="outlined">
        <v-list class="py-0" lines="three">
          <template v-for="(user, index) in users" :key="user.id">
            <v-list-item class="py-3">
              <template #prepend>
                <v-avatar color="surface-variant" size="48">
                  <v-img v-if="user.avatar" :src="user.avatar" cover />
                  <span v-else class="text-subtitle-1 font-weight-medium">
                    {{ userInitial(user.name) }}
                  </span>
                </v-avatar>
              </template>
              <template #title>
                <span class="font-weight-medium">{{ user.name }}</span>
              </template>
              <template #subtitle>
                <div class="mt-1">{{ user.phone }}</div>
                <div class="mt-2">
                  <v-badge
                    color="primary"
                    :content="`${user.totalEarnedCoins} EnCoin`"
                    inline
                  />
                </div>
              </template>
            </v-list-item>
            <v-divider v-if="index < users.length - 1" />
          </template>
        </v-list>
      </v-card>

      <p v-else-if="!isLoading && !error" class="text-body-1 text-medium-emphasis">
        Пользователей пока нет.
      </p>
    </template>
  </div>
</template>

<style scoped>
.admin-users {
  max-width: 960px;
}
</style>
