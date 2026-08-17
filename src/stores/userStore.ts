import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {getApiErrorMessage} from '@/api/errors';
import {tokenStorage} from '@/api/tokenStorage';
import useMessages from '@/use/messages';
import {useAuthRepository} from '@/use/authRepository';
import {useUserRepository} from '@/use/userRepository';
import type {UserInfo} from '@/api/types/user';
import type {AuthResponse} from '@/api/types/auth';

type AuthorizationData = {
  phone: string
  pinCode: string
}

type RegistrationData = AuthorizationData & {
  name: string
  firstGradeYear: number
}

type PinCodeChangeData = {
  currentPin: string
  pinCode: string
  pinCodeConfirmation: string
}

export const RUSSIAN_PHONE_LENGTH = 10;
export const PIN_CODE_LENGTH = 4;
export const MIN_USER_NAME_LENGTH = 2;

const savedPhoneStorageKey = 'en-learning:last-login-phone';

const {addError} = useMessages();

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
  const authRepository = useAuthRepository();
  const userRepository = useUserRepository();

  const isInitialized = ref(false);

  let restoreRequest: Promise<void> | null = null;

  const isAuthenticated = computed(() => user.value !== null);

  const saveUser = async (authorizedUser: UserInfo): Promise<void> => {
    user.value = authorizedUser;
    savedPhone.value = authorizedUser.phone;

    try {
      localStorage.setItem(savedPhoneStorageKey, authorizedUser.phone);
    } catch {
      // Remembering the phone is optional.
    }

    await userRepository.save(authorizedUser).catch(() => {
      // The online session remains usable if the optional offline cache fails.
    });
  }

  const saveAuthorization = async (response: AuthResponse): Promise<void> => {
    await tokenStorage.save({...response, userId: response.user.id});
    await saveUser(response.user);
  }

  const clearAuthorization = async (): Promise<void> => {
    const userId = user.value?.id ?? tokenStorage.getUserId();
    await tokenStorage.clear();
    user.value = null;

    if (userId) {
      void userRepository.remove(userId).catch(() => {
        // Authorization is already cleared even if cache cleanup fails.
      });
    }
  }

  const restoreSession = async (): Promise<void> => {
    if (isInitialized.value) {
      return;
    }

    if (restoreRequest) {
      return restoreRequest;
    }

    restoreRequest = (async () => {
      await tokenStorage.initialize();

      if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
        isInitialized.value = true;
        return;
      }

      try {
        const result = await userRepository.getCurrent(
          tokenStorage.getUserId(),
        );

        if (
          result.source === 'indexedDb'
          && !tokenStorage.isOfflineSessionValid()
        ) {
          throw new Error('Срок офлайн-сессии истёк');
        }

        if (result.source === 'http') {
          await tokenStorage.markOnline();
        }
        await saveUser(result.data);
      } catch {
        await clearAuthorization();
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

    try {
      const response = await authRepository.login(
        toApiPhone(authorizationData.phone),
        authorizationData.pinCode,
      );

      await saveAuthorization(response);
      return true;
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось выполнить авторизацию'));
      return false;
    }
  }

  const register = async (
    registrationData: RegistrationData,
    avatar?: File | null,
  ): Promise<boolean> => {

    try {
      const userFormData = new FormData();

      userFormData.append('name', registrationData.name);
      userFormData.append('phone', toApiPhone(registrationData.phone));
      userFormData.append('pinCode', registrationData.pinCode);
      if (avatar) {
        userFormData.append('avatar', avatar);
      }
      userFormData.append('firstGradeYear', `${registrationData.firstGradeYear}`);

      const response = await authRepository.register(userFormData);

      await saveAuthorization(response);

      if (avatar) {
        try {
          await requestAvatarUpdate(avatar);
        } catch (error) {
          addError(getApiErrorMessage(error,'Регистрация завершена, но загрузить аватар не удалось'));
        }
      }

      return true;
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось выполнить регистрацию'));
      return false;
    }
  }

  const logout = async (): Promise<void> => {

    try {
      if (tokenStorage.getAccessToken()) {
        await authRepository.logout();
      }
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось завершить сессию'));
    } finally {
      await clearAuthorization();

    }
  }

  const updateName = async (nameValue: string): Promise<boolean> => {

    try {
      const updatedUser = await userRepository.updateName(nameValue.trim());

      await saveUser(updatedUser);
      return true;
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось изменить имя'));
      return false;
    }

  }

  const updateUser = async (user: {name: string, avatar?: File|null}): Promise<boolean> => {

    try {
      const userFormData = new FormData();
      userFormData.append('_method', 'PATCH');
      userFormData.append('name', user.name);
      if (user.avatar) {
        userFormData.append('avatar', user.avatar);
      }


      // PHP does not parse multipart request bodies sent with PATCH under the
      // usual FPM setup. Send POST and let Laravel apply the method override.
      const updatedUser = await userRepository.updateMultipart(userFormData);

      await saveUser(updatedUser);
      return true;
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось изменить информацию пользователя'));
      return false;
    }

  }

  const requestAvatarUpdate = async (avatar: File): Promise<void> => {
    const formData = new FormData();
    formData.append('_method', 'PATCH');
    formData.append('avatar', avatar);

    const updatedUser = await userRepository.updateMultipart(formData);
    await saveUser(updatedUser);
  }

  const updateAvatar = async (avatar: File): Promise<boolean> => {

    try {
      await requestAvatarUpdate(avatar);
      return true;
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось изменить аватар'));
      return false;
    }
  }

  const updatePinCode = async (
    pinCodeData: PinCodeChangeData,
  ): Promise<boolean> => {

    try {
      await userRepository.updatePin(pinCodeData);
      await clearAuthorization();
      return true;
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось изменить PIN-код'));
      return false;
    }
  }

  const getUserInitial = (name?:string) => {
    return (name || 'Гость').split(' ').filter(n => n.length > 0).slice(0, 2).map(n => `${n.slice(0,1).toUpperCase()}`).join(' ');
  };

  return {
    user,
    savedPhone,

    isInitialized,
    isAuthenticated,
    restoreSession,
    authorize,
    register,
    updateName,
    updateAvatar,
    updatePinCode,
    updateUser,
    logout,
    getUserInitial
  };
});
