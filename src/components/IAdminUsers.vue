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
  <div class="admin-users">
    <v-alert v-if="!userStore.isAdmin" type="error" variant="tonal">
      Страница доступна только администраторам.
    </v-alert>

    <template v-else>
      <div class="d-flex justify-end mb-3">
        <v-btn
          aria-label="Обновить список пользователей"
          :disabled="!isConnected"
          :loading="isLoading"
          icon="mdi-refresh"
          variant="tonal"
          @click="load"
        />
      </div>

      <v-alert v-if="error" class="mb-4" type="error" variant="tonal">
        {{ error }}
      </v-alert>

      <div
        v-if="isLoading"
        aria-label="Загрузка списка пользователей"
        data-testid="users-skeleton"
      >
        <v-skeleton-loader
          class="bg-transparent"
          type="list-item-avatar-three-line@5"
        />
      </div>

      <v-list v-else-if="users.length > 0" class="py-0 bg-transparent" lines="three">
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
                  class="mr-2"
                  color="secondary"
                  :content="user.grade === null ? 'Класс не указан' : `${user.grade} класс`"
                  inline
                />
                <v-badge
                  color="primary"
                  :content="`Баланс: ${user.balance} EnCoin`"
                  inline
                />
              </div>
            </template>
          </v-list-item>
          <v-divider v-if="index < users.length - 1" />
        </template>
      </v-list>

      <p v-else-if="!isLoading && !error" class="text-body-1 text-medium-emphasis">
        Пользователей пока нет.
      </p>
    </template>
  </div>
</template>
