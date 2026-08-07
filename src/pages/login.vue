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
import useLoading from '@/use/loading';

const {isLoading} = useLoading();

type AuthorizationForm = {
  validate: () => Promise<{valid: boolean}>
}

type PinCodeInputExpose = {
  clearAndFocus: () => Promise<void>
}

const userStore = useUserStore();
const router = useRouter();
const {
  user,
  savedPhone,
  isAuthenticated,
} = storeToRefs(userStore);

const form = ref<AuthorizationForm | null>(null);
const pinCodeInput = ref<PinCodeInputExpose | null>(null);
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
  if (isLoading.value || !isAuthorizationDataValid.value) {
    return;
  }

  const validationResult = await form.value?.validate();

  if (!validationResult?.valid) {
    return;
  }

  const isAuthorized = await userStore.authorize(authorizationData);

  if (isAuthorized) {
    await router.replace('/exercises');
    return;
  }

  authorizationData.pinCode = '';
  await pinCodeInput.value?.clearAndFocus();

}

const hasSavedPhone = computed(() => !!savedPhone.value);


</script>

<template>
  <v-card class="mx-auto" max-width="520" :disabled="isLoading">
    <template v-if="isAuthenticated && user">
      <v-card-title>Профиль</v-card-title>

      <v-card-text>
        <v-list-item
          :subtitle="user.phone"
          :title="user.name"
        >
          <template #prepend>
            <v-avatar
              :key="user.avatar"
              color="primary"
            >
              <v-img
                v-if="user.avatar"
                :src="user.avatar"
                cover
              ></v-img>
              <span v-else>
                {{ user.name.trim().charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
          </template>
        </v-list-item>
      </v-card-text>

      <v-card-actions>
        <v-btn
          :disabled="isLoading"
          color="error"
          prepend-icon="mdi-logout"
          @click="userStore.logout"
        >
          Выйти
        </v-btn>
      </v-card-actions>
    </template>

    <template v-else>
      <v-card-title class="pa-8 text-subtitle-1">Введите номер телефона и ПИН-код</v-card-title>

      <v-card-text>

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
            pattern="[0-9]*"
            prefix="+7"
            prepend-inner-icon="mdi-phone-outline"
            type="tel"
            variant="outlined"
            @update:model-value="updatePhone"

          ></v-text-field>

          <IPinCodeInput
            ref="pinCodeInput"
            v-model="authorizationData.pinCode"
            :autofocus="hasSavedPhone"
            class="mb-4"
            @finish="authorize"

          ></IPinCodeInput>

          <div class="d-flex ga-3">
            <v-btn
              :disabled="!isAuthorizationDataValid || isLoading"
              class="login-action"
              color="primary"
              size="large"
              type="submit"
            >
              Войти
            </v-btn>

            <v-btn
              :disabled="isLoading"
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
