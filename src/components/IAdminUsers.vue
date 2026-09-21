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
        <v-table class="admin-users__table">
          <thead>
            <tr>
              <th>Логин</th>
              <th>Номер телефона</th>
              <th class="text-end">Баланс</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.name }}</td>
              <td class="text-no-wrap">{{ user.phone }}</td>
              <td class="text-end font-weight-medium">{{ user.totalEarnedCoins }}</td>
            </tr>
          </tbody>
        </v-table>
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

.admin-users__table {
  overflow-x: auto;
}

.admin-users__table :deep(table) {
  min-width: 560px;
}
</style>
