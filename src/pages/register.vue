<script setup lang="ts">
import {computed, onBeforeUnmount, reactive, ref} from 'vue';
import {useRouter} from 'vue-router';
import IPinCodeInput from '@/components/IPinCodeInput.vue';
import IAvatarUploadToolbar from '@/components/IAvatarUploadToolbar.vue';
import useMessages from '@/use/messages';
import {
  MIN_USER_NAME_LENGTH,
  normalizeRussianPhone,
  PIN_CODE_LENGTH,
  RUSSIAN_PHONE_LENGTH,
  useUserStore,
} from '@/stores/userStore';
import {prepareAvatar} from '@/utils/prepareAvatar';

const userStore = useUserStore();
const router = useRouter();
const {addInfo, readMessage} = useMessages();

const step = ref(1);
const currentYear = new Date().getFullYear();
const pinCodeConfirmation = ref('');
const avatarFile = ref<File | null>(null);
const avatarError = ref('');
const isPreparingAvatar = ref(false);
let avatarPreviewUrl: string | null = null;
const registrationData = reactive({
  name: '',
  phone: '',
  pinCode: '',
  firstGradeYear: null as number | null,
  avatar: '',
});

const steps = [
  {
    title: 'Данные',
    value: 1,
  },
  {
    title: 'ПИН-код',
    value: 2,
  },
  {
    title: 'Аватар',
    value: 3,
  },
];

const requiredRule = (value: string) => {
  return value.trim().length > 0 || 'Поле обязательно';
}

const nameRule = (value: string) => {
  return value.trim().length >= MIN_USER_NAME_LENGTH
    || `Минимум ${MIN_USER_NAME_LENGTH} символа`;
}

const phoneRule = (value: string) => {
  return normalizeRussianPhone(value).length === RUSSIAN_PHONE_LENGTH
    || 'Введите 10 цифр номера';
}

const firstGradeYearRule = (value: number | null) => {
  return Number.isInteger(value)
    && value !== null
    && value >= 1900
    && value <= currentYear
    || `Введите год от 1900 до ${currentYear}`;
}

const isPersonalDataValid = computed(() => {
  return registrationData.name.trim().length >= MIN_USER_NAME_LENGTH
    && normalizeRussianPhone(registrationData.phone).length === RUSSIAN_PHONE_LENGTH
    && firstGradeYearRule(registrationData.firstGradeYear) === true;
});

const isPinCodeValid = computed(() => {
  return new RegExp(`^\\d{${PIN_CODE_LENGTH}}$`).test(registrationData.pinCode);
});

const isPinCodeConfirmed = computed(() => {
  return pinCodeConfirmation.value === registrationData.pinCode
    && new RegExp(`^\\d{${PIN_CODE_LENGTH}}$`).test(pinCodeConfirmation.value);
});

const updatePhone = (value: string) => {
  registrationData.phone = normalizeRussianPhone(value)
    .slice(0, RUSSIAN_PHONE_LENGTH);
}

const updateAvatar = async (file: File) => {
  avatarError.value = '';

  isPreparingAvatar.value = true;
  const processingMessage = addInfo('Идёт подготовка изображения…', 3);

  try {
    const avatar = await prepareAvatar(file);
    avatarFile.value = avatar;
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    avatarPreviewUrl = URL.createObjectURL(avatar);
    registrationData.avatar = avatarPreviewUrl;
  } catch (error) {
    avatarError.value = error instanceof Error
      ? error.message
      : 'Не удалось обработать изображение';
  } finally {
    isPreparingAvatar.value = false;
    readMessage(processingMessage.id);
  }
}

onBeforeUnmount(() => {
  if (avatarPreviewUrl) {
    URL.revokeObjectURL(avatarPreviewUrl);
  }
});

const register = async () => {
  if (!isPersonalDataValid.value || !isPinCodeValid.value || !isPinCodeConfirmed.value) {
    return;
  }

  const isRegistered = await userStore.register({
    name: registrationData.name,
    phone: registrationData.phone,
    pinCode: registrationData.pinCode,
    firstGradeYear: registrationData.firstGradeYear as number,
  }, avatarFile.value);

  if (isRegistered) {
    await router.replace('/exercises');
  }
}
</script>

<template>
  <v-card class="mx-auto" max-width="720">
    <v-card-title>Регистрация</v-card-title>
    <v-card-subtitle>
      Создайте профиль за три шага
    </v-card-subtitle>
    <v-card-text>
      <v-stepper
        v-model="step"
        :items="steps"
        hide-actions
      >
        <template #item.1>
          <v-text-field
            v-model="registrationData.name"
            :rules="[requiredRule, nameRule]"
            autocomplete="name"
            label="Имя"
            prepend-inner-icon="mdi-account-outline"
            validate-on="input"
            variant="outlined"
          ></v-text-field>

          <v-text-field
            :model-value="registrationData.phone"
            :rules="[requiredRule, phoneRule]"
            autocomplete="tel"
            inputmode="numeric"
            label="Телефон"
            maxlength="10"
            pattern="[0-9]*"
            prefix="+7"
            prepend-inner-icon="mdi-phone-outline"
            type="tel"
            validate-on="input"
            variant="outlined"
            @update:model-value="updatePhone"
          ></v-text-field>

          <v-text-field
            v-model.number="registrationData.firstGradeYear"
            :max="currentYear"
            :rules="[firstGradeYearRule]"
            autocomplete="off"
            inputmode="numeric"
            label="Год поступления в первый класс"
            min="1900"
            prepend-inner-icon="mdi-calendar-school"
            type="number"
            validate-on="input"
            variant="outlined"
          ></v-text-field>

          <div class="d-flex justify-end">
            <v-btn
              :disabled="!isPersonalDataValid"
              color="primary"
              @click="step = 2"
            >
              Продолжить
            </v-btn>
          </div>
        </template>

        <template #item.2>
          <div class="text-subtitle-1 mb-3">Придумайте ПИН-код</div>

          <IPinCodeInput
            v-model="registrationData.pinCode"
            autofocus
            class="mb-6"
          ></IPinCodeInput>

          <div class="text-subtitle-1 mb-3">Повторите ПИН-код</div>

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

          <div class="d-flex justify-space-between">
            <v-btn @click="step = 1" variant="text">
              Назад
            </v-btn>

            <v-btn
              :disabled="!isPinCodeConfirmed"
              color="primary"
              @click="step = 3"
            >
              Продолжить
            </v-btn>
          </div>
        </template>

        <template #item.3>
          <div class="d-flex flex-column align-center mb-4">
            <IAvatarUploadToolbar
              :preview="registrationData.avatar"
              :processing="isPreparingAvatar"
              @select="updateAvatar"
            ></IAvatarUploadToolbar>
            <div v-if="avatarError" class="text-error text-caption mt-2">{{ avatarError }}</div>
          </div>

          <div class="d-flex justify-space-between">
            <v-btn variant="text" @click="step = 2">
              Назад
            </v-btn>

            <v-btn
              :disabled="isPreparingAvatar"
              color="primary"
              @click="register"
            >
              Зарегистрироваться
            </v-btn>
          </div>
        </template>
      </v-stepper>
    </v-card-text>

    <v-card-actions>
      <v-btn prepend-icon="mdi-login" variant="text" to="/login">
        Уже есть аккаунт
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
