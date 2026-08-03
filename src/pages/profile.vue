<script setup lang="ts">
import {computed, ref} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import IPinCodeInput from '@/components/IPinCodeInput.vue';
import {
  MIN_USER_NAME_LENGTH,
  PIN_CODE_LENGTH,
  useUserStore,
} from '@/stores/userStore';

const userStore = useUserStore();
const router = useRouter();
const {user, isLoading, errorMessage} = storeToRefs(userStore);

const name = ref(user.value?.name ?? '');
const currentPin = ref('');
const pinCode = ref('');
const pinCodeConfirmation = ref('');
const isPinCodeEditorOpen = ref(false);
const successMessage = ref('');
const avatarFile = ref<File | null>(null);
const avatarPreview = ref(user.value?.avatar ?? '');
const avatarError = ref('');
const userInitial = computed(() => {
  return (user.value?.name ?? '').trim().charAt(0).toUpperCase();
});

const isNameValid = computed(() => {
  return name.value.trim().length >= MIN_USER_NAME_LENGTH;
});

const isPinCodeValid = computed(() => {
  return new RegExp(`^\\d{${PIN_CODE_LENGTH}}$`).test(pinCode.value);
});

const isPinCodeConfirmed = computed(() => {
  return isPinCodeValid.value
    && pinCodeConfirmation.value === pinCode.value;
});

const saveName = async () => {
  successMessage.value = '';

  if (await userStore.updateName(name.value)) {
    successMessage.value = 'Имя изменено';
  }
}

const selectAvatar = (value: File | File[] | null) => {
  const file = Array.isArray(value) ? value[0] : value;

  avatarFile.value = file ?? null;
  avatarError.value = '';
  avatarPreview.value = user.value?.avatar ?? '';

  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    avatarError.value = 'Выберите изображение';
    avatarFile.value = null;
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    avatarError.value = 'Размер изображения не должен превышать 2 МБ';
    avatarFile.value = null;
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    avatarPreview.value = typeof reader.result === 'string'
      ? reader.result
      : user.value?.avatar ?? '';
  };
  reader.onerror = () => {
    avatarError.value = 'Не удалось прочитать изображение';
    avatarFile.value = null;
  };
  reader.readAsDataURL(file);
}

const saveAvatar = async () => {
  successMessage.value = '';

  if (avatarFile.value && await userStore.updateAvatar(avatarFile.value)) {
    avatarFile.value = null;
    avatarPreview.value = user.value?.avatar ?? '';
    successMessage.value = 'Аватар изменён';
  }
}

const savePinCode = async () => {
  successMessage.value = '';

  const isUpdated = await userStore.updatePinCode({
    currentPin: currentPin.value,
    pinCode: pinCode.value,
    pinCodeConfirmation: pinCodeConfirmation.value,
  });

  if (isUpdated) {
    currentPin.value = '';
    pinCode.value = '';
    pinCodeConfirmation.value = '';
    await router.replace('/login');
    successMessage.value = 'ПИН-код изменён';
  }
}

const closePinCodeEditor = () => {
  currentPin.value = '';
  pinCode.value = '';
  pinCodeConfirmation.value = '';
  isPinCodeEditorOpen.value = false;
}

const logout = async () => {
  await userStore.logout();
  await router.replace('/login');
}
</script>

<template>
  <v-card class="mx-auto" max-width="720">
    <v-card-title>Профиль</v-card-title>
    <v-card-subtitle>{{ user?.phone }}</v-card-subtitle>

<!--    <v-progress-linear-->
<!--      :active="isLoading"-->
<!--      :indeterminate="isLoading"-->
<!--      color="primary"-->
<!--      height="3"-->
<!--    ></v-progress-linear>-->

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

      <v-alert
        v-if="successMessage"
        class="mb-4"
        closable
        type="success"
        variant="tonal"
        @click:close="successMessage = ''"
      >
        {{ successMessage }}
      </v-alert>

      <v-form class="mb-8" @submit.prevent="saveAvatar">
        <div class="text-h6 mb-4">Аватар</div>

        <div class="d-flex justify-center mb-6">
          <v-avatar
            :key="avatarPreview"
            color="primary"
            size="112"
          >
            <v-img
              v-if="avatarPreview"
              :src="avatarPreview"
              cover
            ></v-img>
            <span v-else class="text-h3">{{ userInitial }}</span>
          </v-avatar>
        </div>

        <v-file-input
          :error-messages="avatarError"
          :model-value="avatarFile"
          accept="image/*"
          label="Выберите изображение"
          prepend-icon=""
          prepend-inner-icon="mdi-camera"
          show-size
          variant="outlined"
          @update:model-value="selectAvatar"
        ></v-file-input>

        <div class="d-flex justify-end">
          <v-btn
            :disabled="!avatarFile || Boolean(avatarError) || isLoading"
            color="primary"
            type="submit"
            variant="outlined"
          >
            Сохранить аватар
          </v-btn>
        </div>
      </v-form>

      <v-divider class="mb-8"></v-divider>

      <v-form class="mb-8" @submit.prevent="saveName">
        <div class="text-h6 mb-3">Имя</div>

        <v-text-field
          v-model="name"
          :rules="[
            value => value.trim().length > 0 || 'Поле обязательно',
            value => value.trim().length >= MIN_USER_NAME_LENGTH
              || `Минимум ${MIN_USER_NAME_LENGTH} символа`,
          ]"
          autocomplete="name"
          label="Имя"
          prepend-inner-icon="mdi-account-outline"
          validate-on="input"
          variant="outlined"
        ></v-text-field>

        <div class="d-flex justify-end">
          <v-btn
            :disabled="!isNameValid || name.trim() === user?.name || isLoading"
            color="primary"
            type="submit"
            variant="outlined"
          >
            Сохранить имя
          </v-btn>
        </div>
      </v-form>

      <v-divider class="mb-8"></v-divider>

      <div v-if="!isPinCodeEditorOpen" class="d-flex justify-end">
        <v-btn
          color="primary"
          @click="isPinCodeEditorOpen = true"
        >
          Изменить ПИН-код
        </v-btn>
      </div>

      <v-expand-transition>
        <v-form
          v-if="isPinCodeEditorOpen"
          @submit.prevent="savePinCode"
        >
          <div class="text-h6 mb-4">Текущий ПИН-код</div>

          <IPinCodeInput
            v-model="currentPin"
            autofocus
            class="mb-6"
          ></IPinCodeInput>

          <div class="text-h6 mb-4">Новый ПИН-код</div>

          <IPinCodeInput
            v-model="pinCode"
            class="mb-4"
          ></IPinCodeInput>

          <div class="text-subtitle-1 mb-4">ПИН-код ещё раз</div>

          <IPinCodeInput
            v-model="pinCodeConfirmation"
            class="mb-2"
          ></IPinCodeInput>

          <v-alert
            v-if="pinCodeConfirmation.length === PIN_CODE_LENGTH && !isPinCodeConfirmed"
            class="mb-4"
            density="compact"
            type="error"
            variant="tonal"
          >
            ПИН-коды не совпадают
          </v-alert>

          <div class="d-flex justify-end ga-3">
            <v-btn
              :disabled="isLoading"
              color="grey"
              @click="closePinCodeEditor"
            >
              Отмена
            </v-btn>

            <v-btn
              :disabled="currentPin.length !== PIN_CODE_LENGTH || !isPinCodeConfirmed || isLoading"
              color="primary"
              type="submit"
            >
              Сохранить ПИН-код
            </v-btn>
          </div>
        </v-form>
      </v-expand-transition>

      <v-divider class="my-8"></v-divider>

      <div class="d-flex justify-end">
        <v-btn
          :disabled="isLoading"
          color="grey"
          variant="outlined"
          @click="logout"
        >
          Выйти
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
