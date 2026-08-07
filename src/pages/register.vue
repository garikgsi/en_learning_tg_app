<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {useRouter} from 'vue-router';
import IPinCodeInput from '@/components/IPinCodeInput.vue';
import {
  MIN_USER_NAME_LENGTH,
  normalizeRussianPhone,
  PIN_CODE_LENGTH,
  RUSSIAN_PHONE_LENGTH,
  useUserStore,
} from '@/stores/userStore';

const userStore = useUserStore();
const router = useRouter();

const step = ref(1);
const currentYear = new Date().getFullYear();
const pinCodeConfirmation = ref('');
const avatarFile = ref<File | null>(null);
const avatarError = ref('');
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

const registrationInitial = computed(() => {
  return registrationData.name.trim().charAt(0).toUpperCase();
});

const updatePhone = (value: string) => {
  registrationData.phone = normalizeRussianPhone(value)
    .slice(0, RUSSIAN_PHONE_LENGTH);
}

const updateAvatar = (value: File | File[] | null) => {
  const file = Array.isArray(value) ? value[0] : value;

  avatarFile.value = file ?? null;
  avatarError.value = '';
  registrationData.avatar = '';

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
    registrationData.avatar = typeof reader.result === 'string'
      ? reader.result
      : '';
  };
  reader.onerror = () => {
    avatarError.value = 'Не удалось прочитать изображение';
    avatarFile.value = null;
  };
  reader.readAsDataURL(file);
}

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
            <v-btn @click="step = 2">
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
            <v-avatar
              class="mb-4"
              color="primary"
              size="112"
            >
              <v-img
                v-if="registrationData.avatar"
                :src="registrationData.avatar"
                cover
              ></v-img>
              <span v-else class="text-h3">
                {{ registrationInitial }}
              </span>
            </v-avatar>

            <v-file-input
              :error-messages="avatarError"
              :model-value="avatarFile"
              accept="image/*"
              class="w-100"
              label="Выберите изображение"
              prepend-icon=""
              prepend-inner-icon="mdi-camera"
              show-size
              variant="outlined"
              @update:model-value="updateAvatar"
            ></v-file-input>
          </div>

          <div class="d-flex justify-space-between">
            <v-btn @click="step = 2">
              Назад
            </v-btn>

            <v-btn
              color="primary"
              @click="register"
            >
              {{ registrationData.avatar ? 'Закончить регистрацию' : 'Пропустить' }}
            </v-btn>
          </div>
        </template>
      </v-stepper>
    </v-card-text>

    <v-card-actions>
      <v-btn prepend-icon="mdi-login" to="/login">
        Уже есть аккаунт
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
