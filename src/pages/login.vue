<script setup lang="ts">
import {reactive, ref} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import {
  MIN_PASSWORD_LENGTH,
  MIN_USER_NAME_LENGTH,
  useUserStore,
} from '@/stores/userStore';

type AuthorizationForm = {
  validate: () => Promise<{valid: boolean}>
}

const userStore = useUserStore();
const router = useRouter();
const {
  user,
  isLoading,
  errorMessage,
  isAuthenticated,
} = storeToRefs(userStore);

const form = ref<AuthorizationForm | null>(null);
const isFormValid = ref<boolean | null>(false);
const isPasswordVisible = ref(false);
const authorizationData = reactive({
  name: '',
  password: '',
});

const requiredRule = (value: string) => {
  return value.trim().length > 0 || 'Поле обязательно';
}

const nameLengthRule = (value: string) => {
  return value.trim().length >= MIN_USER_NAME_LENGTH
    || `Минимум ${MIN_USER_NAME_LENGTH} символа`;
}

const passwordLengthRule = (value: string) => {
  return value.length >= MIN_PASSWORD_LENGTH
    || `Минимум ${MIN_PASSWORD_LENGTH} символов`;
}

const authorize = async () => {
  const validationResult = await form.value?.validate();

  if (!validationResult?.valid) {
    return;
  }

  const isAuthorized = await userStore.authorize(authorizationData);

  if (isAuthorized) {
    await router.replace('/exercises');
  }
}
</script>

<template>
  <v-card class="mx-auto" max-width="520">
    <template v-if="isAuthenticated && user">
      <v-card-title>Профиль</v-card-title>

      <v-card-text>
        <v-list-item
          :prepend-avatar="user.avatar"
          :subtitle="user.email"
          :title="user.name"
        ></v-list-item>
      </v-card-text>

      <v-card-actions>
        <v-btn
          :loading="isLoading"
          color="error"
          prepend-icon="mdi-logout"
          variant="tonal"
          @click="userStore.logout"
        >
          Выйти
        </v-btn>
      </v-card-actions>
    </template>

    <template v-else>
      <v-card-title>Авторизация</v-card-title>
      <v-card-subtitle>
        Введите имя и пароль
      </v-card-subtitle>

      <v-card-text>
        <v-alert
          v-if="errorMessage"
          class="mb-4"
          closable
          type="error"
          @click:close="userStore.clearError"
        >
          {{ errorMessage }}
        </v-alert>

        <v-form
          ref="form"
          v-model="isFormValid"
          validate-on="input"
          @submit.prevent="authorize"
        >
          <v-text-field
            v-model="authorizationData.name"
            :rules="[requiredRule, nameLengthRule]"
            autocomplete="username"
            label="Имя"
            prepend-inner-icon="mdi-account-outline"
            variant="outlined"
          ></v-text-field>

          <v-text-field
            v-model="authorizationData.password"
            :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
            :rules="[requiredRule, passwordLengthRule]"
            :type="isPasswordVisible ? 'text' : 'password'"
            autocomplete="current-password"
            label="Пароль"
            prepend-inner-icon="mdi-lock-outline"
            variant="outlined"
            @click:append-inner="isPasswordVisible = !isPasswordVisible"
          ></v-text-field>

          <v-btn
            :disabled="!isFormValid || isLoading"
            :loading="isLoading"
            block
            color="primary"
            size="large"
            type="submit"
          >
            Войти
          </v-btn>
        </v-form>
      </v-card-text>
    </template>
  </v-card>
</template>
