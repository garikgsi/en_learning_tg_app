<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import IPinCodeInput from '@/components/IPinCodeInput.vue';
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
          :subtitle="user.phone"
          :title="user.name"
        >
          <template #prepend>
            <v-avatar
              color="primary"
              :image="user.avatar || undefined"
            >
              <span v-if="!user.avatar">
                {{ user.name.trim().charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
          </template>
        </v-list-item>
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

          <IPinCodeInput
            v-model="authorizationData.pinCode"
            :autofocus="Boolean(savedPhone)"
            :loading="isLoading"
            class="mb-4"
          ></IPinCodeInput>

          <div class="d-flex ga-3">
            <v-btn
              :disabled="!isAuthorizationDataValid || isLoading"
              :loading="isLoading"
              class="login-action"
              color="primary"
              size="large"
              type="submit"
            >
              Войти
            </v-btn>

            <v-btn
              class="login-action"
              color="secondary"
              size="large"
              to="/register"
            >
              Регистрация
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </template>
  </v-card>
</template>

<style scoped>
.login-action {
  flex: 1 1 0;
  min-width: 0;
}
</style>
