import {computed, ref} from 'vue';
import {defineStore} from 'pinia';

export type UserInfo = {
  id: string
  name: string
  phone: string
  avatar: string
  email: string
  createdAt: string
}

export type AuthorizationData = {
  phone: string
  pinCode: string
}

export const RUSSIAN_PHONE_LENGTH = 10;
export const PIN_CODE_LENGTH = 4;

const defaultAvatar = 'https://cdn.vuetifyjs.com/images/john.png';
const savedPhoneStorageKey = 'en-learning:last-login-phone';

const getSavedPhone = (): string => {
  try {
    return localStorage.getItem(savedPhoneStorageKey) ?? '';
  } catch {
    return '';
  }
}

export const normalizeRussianPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return digits.slice(1);
  }

  return digits;
}

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo | null>(null);
  const savedPhone = ref(getSavedPhone());
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  const requestAuthorization = async (
    authorizationData: AuthorizationData,
  ): Promise<UserInfo> => {
    // Temporary async boundary. Replace this block with an API request later.
    await new Promise(resolve => setTimeout(resolve, 400));

    const phoneDigits = normalizeRussianPhone(authorizationData.phone);
    const pinCode = authorizationData.pinCode;

    if (!phoneDigits || !pinCode) {
      throw new Error('Укажите телефон и ПИН-код');
    }

    if (phoneDigits.length !== RUSSIAN_PHONE_LENGTH) {
      throw new Error('Введите корректный номер телефона');
    }

    if (!new RegExp(`^\\d{${PIN_CODE_LENGTH}}$`).test(pinCode)) {
      throw new Error(`ПИН-код должен содержать ${PIN_CODE_LENGTH} цифры`);
    }

    return {
      id: `local-${phoneDigits}`,
      name: 'Пользователь',
      phone: `+7${phoneDigits}`,
      avatar: defaultAvatar,
      email: `user.${phoneDigits}@example.org`,
      createdAt: new Date().toISOString(),
    };
  }

  const authorize = async (
    authorizationData: AuthorizationData,
  ): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const authorizedUser = await requestAuthorization(authorizationData);

      user.value = authorizedUser;
      savedPhone.value = authorizedUser.phone;

      try {
        localStorage.setItem(savedPhoneStorageKey, authorizedUser.phone);
      } catch {
        // Authorization should still succeed when persistent storage is unavailable.
      }

      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error
        ? error.message
        : 'Не удалось выполнить авторизацию';

      return false;
    } finally {
      isLoading.value = false;
    }
  }

  const logout = async (): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      // Temporary async boundary for a future API request.
      await new Promise(resolve => setTimeout(resolve, 200));
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  const clearError = (): void => {
    errorMessage.value = null;
  }

  return {
    user,
    savedPhone,
    isLoading,
    errorMessage,
    isAuthenticated,
    authorize,
    logout,
    clearError,
  };
});
