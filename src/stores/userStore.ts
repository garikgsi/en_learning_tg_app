import {computed, ref} from 'vue';
import {defineStore} from 'pinia';

export type UserInfo = {
  id: string
  name: string
  avatar: string
  email: string
  createdAt: string
}

export type AuthorizationData = {
  name: string
  password: string
}

export const MIN_USER_NAME_LENGTH = 2;
export const MIN_PASSWORD_LENGTH = 6;

const defaultAvatar = 'https://cdn.vuetifyjs.com/images/john.png';

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  const requestAuthorization = async (
    authorizationData: AuthorizationData,
  ): Promise<UserInfo> => {
    // Temporary async boundary. Replace this block with an API request later.
    await new Promise(resolve => setTimeout(resolve, 400));

    const name = authorizationData.name.trim();
    const password = authorizationData.password;

    if (!name || !password.trim()) {
      throw new Error('Укажите имя и пароль');
    }

    if (name.length < MIN_USER_NAME_LENGTH) {
      throw new Error(`Имя должно содержать минимум ${MIN_USER_NAME_LENGTH} символа`);
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`);
    }

    return {
      id: `local-${Date.now()}`,
      name,
      avatar: defaultAvatar,
      email: `${name.toLocaleLowerCase().replace(/\s+/g, '.')}@example.org`,
      createdAt: new Date().toISOString(),
    };
  }

  const authorize = async (
    authorizationData: AuthorizationData,
  ): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      user.value = await requestAuthorization(authorizationData);
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
    isLoading,
    errorMessage,
    isAuthenticated,
    authorize,
    logout,
    clearError,
  };
});
