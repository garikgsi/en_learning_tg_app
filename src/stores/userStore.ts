import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {apiClient} from '@/api/client';
import {getApiErrorMessage} from '@/api/errors';
import {tokenStorage, type TokenPair} from '@/api/tokenStorage';

export type UserInfo = {
  id: string
  name: string
  phone: string
  avatar: string
  createdAt: string
}

export type AuthorizationData = {
  phone: string
  pinCode: string
}

export type RegistrationData = AuthorizationData & {
  name: string
  firstGradeYear: number
}

export type PinCodeChangeData = {
  currentPin: string
  pinCode: string
  pinCodeConfirmation: string
}

type AuthResponse = TokenPair & {
  user: UserInfo
  tokenType: 'Bearer'
  expiresIn: number
}

type UserResponse = {
  data: UserInfo
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

const toApiPhone = (phone: string): string => {
  return `+7${normalizeRussianPhone(phone)}`;
}

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo | null>(null);
  const savedPhone = ref(getSavedPhone());

  const isInitialized = ref(false);
  const errorMessage = ref<string | null>(null);
  let restoreRequest: Promise<void> | null = null;

  const isAuthenticated = computed(() => user.value !== null);

  const saveUser = (authorizedUser: UserInfo): void => {
    user.value = authorizedUser;
    savedPhone.value = authorizedUser.phone;

    try {
      localStorage.setItem(savedPhoneStorageKey, authorizedUser.phone);
    } catch {
      // Remembering the phone is optional.
    }
  }

  const saveAuthorization = (response: AuthResponse): void => {
    tokenStorage.save(response);
    saveUser(response.user);
  }

  const clearAuthorization = (): void => {
    tokenStorage.clear();
    user.value = null;
  }

  const restoreSession = async (): Promise<void> => {
    if (isInitialized.value) {
      return;
    }

    if (restoreRequest) {
      return restoreRequest;
    }

    restoreRequest = (async () => {
      if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
        isInitialized.value = true;
        return;
      }

      try {
        const {data} = await apiClient.get<UserResponse>('/api/v1/users/me');
        saveUser(data.data);
      } catch {
        clearAuthorization();
      } finally {
        isInitialized.value = true;
        restoreRequest = null;
      }
    })();

    return restoreRequest;
  }

  const authorize = async (
    authorizationData: AuthorizationData,
  ): Promise<boolean> => {

    errorMessage.value = null;

    try {
      const {data} = await apiClient.post<AuthResponse>('/api/v1/auth/login', {
        phone: toApiPhone(authorizationData.phone),
        pinCode: authorizationData.pinCode,
      });

      saveAuthorization(data);
      return true;
    } catch (error) {
      errorMessage.value = getApiErrorMessage(
        error,
        'Не удалось выполнить авторизацию',
      );
      return false;
    }
  }

  const register = async (
    registrationData: RegistrationData,
    avatar?: File | null,
  ): Promise<boolean> => {

    errorMessage.value = null;

    try {
      const {data} = await apiClient.post<AuthResponse>('/api/v1/auth/register', {
        name: registrationData.name.trim(),
        phone: toApiPhone(registrationData.phone),
        pinCode: registrationData.pinCode,
        firstGradeYear: registrationData.firstGradeYear,
      });

      saveAuthorization(data);

      if (avatar) {
        try {
          await requestAvatarUpdate(avatar);
        } catch (error) {
          errorMessage.value = getApiErrorMessage(
            error,
            'Регистрация завершена, но загрузить аватар не удалось',
          );
        }
      }

      return true;
    } catch (error) {
      errorMessage.value = getApiErrorMessage(
        error,
        'Не удалось выполнить регистрацию',
      );
      return false;
    }
  }

  const logout = async (): Promise<void> => {

    errorMessage.value = null;

    try {
      if (tokenStorage.getAccessToken()) {
        await apiClient.post('/api/v1/auth/logout');
      }
    } catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Не удалось завершить сессию');
    } finally {
      clearAuthorization();

    }
  }

  const updateName = async (nameValue: string): Promise<boolean> => {

    errorMessage.value = null;

    try {
      const {data} = await apiClient.patch<UserResponse>('/api/v1/users/me', {
        name: nameValue.trim(),
      });

      saveUser(data.data);
      return true;
    } catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Не удалось изменить имя');
      return false;
    }
  }

  const requestAvatarUpdate = async (avatar: File): Promise<void> => {
    const formData = new FormData();
    formData.append('_method', 'PATCH');
    formData.append('avatar', avatar);

    const {data} = await apiClient.post<UserResponse>('/api/v1/users/me', formData);
    saveUser(data.data);
  }

  const updateAvatar = async (avatar: File): Promise<boolean> => {

    errorMessage.value = null;

    try {
      await requestAvatarUpdate(avatar);
      return true;
    } catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Не удалось изменить аватар');
      return false;
    }
  }

  const updatePinCode = async (
    pinCodeData: PinCodeChangeData,
  ): Promise<boolean> => {

    errorMessage.value = null;

    try {
      await apiClient.put('/api/v1/users/me/pin', pinCodeData);
      clearAuthorization();
      return true;
    } catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Не удалось изменить PIN-код');
      return false;
    }
  }

  const clearError = (): void => {
    errorMessage.value = null;
  }

  return {
    user,
    savedPhone,

    isInitialized,
    errorMessage,
    isAuthenticated,
    restoreSession,
    authorize,
    register,
    updateName,
    updateAvatar,
    updatePinCode,
    logout,
    clearError,
  };
});
