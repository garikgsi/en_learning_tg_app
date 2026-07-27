import {ref} from 'vue';
import {defineStore} from 'pinia';

export const useSettingsStore = defineStore('settings', () => {
  const dictionaryWordsPerPage = ref(30);

  return {
    dictionaryWordsPerPage,
  };
});
