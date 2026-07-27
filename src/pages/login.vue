<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import {
  normalizeRussianPhone,
  PIN_CODE_LENGTH,
  RUSSIAN_PHONE_LENGTH,
  useUserStore,
} from '@/stores/userStore';

type AuthorizationForm = {
  validate: () => Promise<{valid: boolean}>
}

const userStore = useUserStore();
const router = useRouter();
const {
  user,
  savedPhone,
  isLoading,
  errorMessage,
  isAuthenticated,
} = storeToRefs(userStore);

const form = ref<AuthorizationForm | null>(null);
const authorizationData = reactive({
  phone: normalizeRussianPhone(savedPhone.value),
  pinCode: '',
});

const requiredRule = (value: string) => {
  return value.trim().length > 0 || 'Поле обязательно';
}

const phoneRule = (value: string) => {
  return normalizeRussianPhone(value).length === RUSSIAN_PHONE_LENGTH
    || 'Введите 10 цифр номера';
}

const isAuthorizationDataValid = computed(() => {
  return normalizeRussianPhone(authorizationData.phone).length === RUSSIAN_PHONE_LENGTH
    && new RegExp(`^\\d{${PIN_CODE_LENGTH}}$`).test(authorizationData.pinCode);
});

const updatePhone = (value: string) => {
  authorizationData.phone = normalizeRussianPhone(value)
    .slice(0, RUSSIAN_PHONE_LENGTH);
}

const updatePinCode = (value: string) => {
  authorizationData.pinCode = value.replace(/\D/g, '')
    .slice(0, PIN_CODE_LENGTH);
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
          :subtitle="user.phone"
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
        Введите номер телефона и ПИН-код
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
          validate-on="input"
          @submit.prevent="authorize"
        >
          <v-text-field
            :model-value="authorizationData.phone"
            :rules="[requiredRule, phoneRule]"
            autocomplete="tel"
            inputmode="numeric"
            label="Телефон"
            maxlength="10"
            prefix="+7"
            prepend-inner-icon="mdi-phone-outline"
            type="tel"
            variant="outlined"
            @update:model-value="updatePhone"
          ></v-text-field>

          <v-otp-input
            :autofocus="Boolean(savedPhone)"
            :length="PIN_CODE_LENGTH"
            :loading="isLoading"
            :model-value="authorizationData.pinCode"
            class="login-otp mb-4"
            divider="-"
            label="Цифра ПИН-кода"
            type="number"
            @update:model-value="updatePinCode"
          ></v-otp-input>

          <v-btn
            :disabled="!isAuthorizationDataValid || isLoading"
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

<style scoped>
.login-otp {
  width: 100%;
}

.login-otp :deep(.v-otp-input__content) {
  gap: 8px;
  width: 100%;
  max-width: none;
  padding-inline: 0;
}

.login-otp :deep(.v-field) {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
}

.login-otp :deep(.v-otp-input__divider) {
  flex: 0 0 auto;
  margin-inline: 0;
}
</style>
