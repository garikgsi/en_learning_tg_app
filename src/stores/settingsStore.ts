import {ref, watch} from 'vue';
import {defineStore} from 'pinia';

const THEME_STORAGE_KEY = 'english-learning-theme';

const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme === 'dark';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export const useSettingsStore = defineStore('settings', () => {
  const dictionaryWordsPerPage = ref(30);
  const isDarkTheme = ref(getInitialTheme());

  watch(isDarkTheme, (isDark) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  });

  return {
    dictionaryWordsPerPage,
    isDarkTheme,
  };
});
