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

export type RegistrationData = AuthorizationData & {
  name: string
  avatar?: string
}

export type PinCodeChangeData = {
  pinCode: string
  pinCodeConfirmation: string
}

export const RUSSIAN_PHONE_LENGTH = 10;
export const PIN_CODE_LENGTH = 4;
export const MIN_USER_NAME_LENGTH = 2;

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
      avatar: '',
      email: `user.${phoneDigits}@example.org`,
      createdAt: new Date().toISOString(),
    };
  }

  const requestRegistration = async (
    registrationData: RegistrationData,
  ): Promise<UserInfo> => {
    // Temporary async boundary. Replace this block with an API request later.
    await new Promise(resolve => setTimeout(resolve, 500));

    const name = registrationData.name.trim();
    const phoneDigits = normalizeRussianPhone(registrationData.phone);
    const pinCode = registrationData.pinCode;

    if (name.length < MIN_USER_NAME_LENGTH) {
      throw new Error(`Имя должно содержать минимум ${MIN_USER_NAME_LENGTH} символа`);
    }

    if (phoneDigits.length !== RUSSIAN_PHONE_LENGTH) {
      throw new Error('Введите корректный номер телефона');
    }

    if (!new RegExp(`^\\d{${PIN_CODE_LENGTH}}$`).test(pinCode)) {
      throw new Error(`ПИН-код должен содержать ${PIN_CODE_LENGTH} цифры`);
    }

    return {
      id: `local-${phoneDigits}`,
      name,
      phone: `+7${phoneDigits}`,
      avatar: registrationData.avatar || '',
      email: `user.${phoneDigits}@example.org`,
      createdAt: new Date().toISOString(),
    };
  }

  const saveAuthorizedUser = (authorizedUser: UserInfo): void => {
    user.value = authorizedUser;
    savedPhone.value = authorizedUser.phone;

    try {
      localStorage.setItem(savedPhoneStorageKey, authorizedUser.phone);
    } catch {
      // Authorization should still succeed when persistent storage is unavailable.
    }
  }

  const authorize = async (
    authorizationData: AuthorizationData,
  ): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const authorizedUser = await requestAuthorization(authorizationData);

      saveAuthorizedUser(authorizedUser);

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

  const register = async (
    registrationData: RegistrationData,
  ): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const registeredUser = await requestRegistration(registrationData);

      saveAuthorizedUser(registeredUser);
      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error
        ? error.message
        : 'Не удалось выполнить регистрацию';

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

  const updateName = async (nameValue: string): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      // Temporary async boundary. Replace this block with an API request later.
      await new Promise(resolve => setTimeout(resolve, 300));

      const name = nameValue.trim();

      if (name.length < MIN_USER_NAME_LENGTH) {
        throw new Error(`Имя должно содержать минимум ${MIN_USER_NAME_LENGTH} символа`);
      }

      if (!user.value) {
        throw new Error('Пользователь не авторизован');
      }

      user.value = {
        ...user.value,
        name,
      };

      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error
        ? error.message
        : 'Не удалось изменить имя';

      return false;
    } finally {
      isLoading.value = false;
    }
  }

  const updateAvatar = async (avatar: string): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      // Temporary async boundary. Replace this block with an API request later.
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!avatar.startsWith('data:image/')) {
        throw new Error('Выберите корректное изображение');
      }

      if (!user.value) {
        throw new Error('Пользователь не авторизован');
      }

      user.value = {
        ...user.value,
        avatar,
      };

      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error
        ? error.message
        : 'Не удалось изменить аватар';

      return false;
    } finally {
      isLoading.value = false;
    }
  }

  const updatePinCode = async (
    pinCodeData: PinCodeChangeData,
  ): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      // Temporary async boundary. Replace this block with an API request later.
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!new RegExp(`^\\d{${PIN_CODE_LENGTH}}$`).test(pinCodeData.pinCode)) {
        throw new Error(`ПИН-код должен содержать ${PIN_CODE_LENGTH} цифры`);
      }

      if (pinCodeData.pinCode !== pinCodeData.pinCodeConfirmation) {
        throw new Error('ПИН-коды не совпадают');
      }

      if (!user.value) {
        throw new Error('Пользователь не авторизован');
      }

      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error
        ? error.message
        : 'Не удалось изменить ПИН-код';

      return false;
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
    register,
    updateName,
    updateAvatar,
    updatePinCode,
    logout,
    clearError,
  };
});
