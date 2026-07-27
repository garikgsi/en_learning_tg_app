<script setup lang="ts">
import {storeToRefs} from 'pinia';
import IAppLayout from '@/components/IAppLayout.vue';
import {
  type DictionaryWord,
  useDictionaryStore,
} from '@/stores/dictionaryStore';
import {useSettingsStore} from '@/stores/settingsStore';

const dictionaryStore = useDictionaryStore();
const settingsStore = useSettingsStore();
const {
  items,
  totalItems,
  isLoading,
  search,
  sortBy,
} = storeToRefs(dictionaryStore);
const {dictionaryWordsPerPage} = storeToRefs(settingsStore);

const headers = [
  {
    title: 'Английское слово',
    key: 'english',
  },
  {
    title: 'Перевод',
    key: 'russian',
  },
  {
    title: 'Повторения',
    key: 'repeatCount',
    align: 'end',
    width: 140,
  },
] as const;

const getRepeatBadgeColor = (word: DictionaryWord) => {
  return word.successfulRepeatCount > word.failedRepeatCount
    ? 'success'
    : 'error';
}

const getRepeatBadgeTitle = (word: DictionaryWord) => {
  return `Успешно: ${word.successfulRepeatCount}, безуспешно: ${word.failedRepeatCount}`;
}
</script>

<template>
  <IAppLayout title="Словарь">
    <v-card>
      <v-card-title class="d-flex flex-column flex-sm-row ga-4 align-sm-center">
        <span class="flex-grow-1">Словарь</span>

        <v-text-field
          :model-value="search"
          clearable
          density="compact"
          hide-details
          label="Поиск по словам"
          max-width="420"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          @update:model-value="dictionaryStore.searchDictionary"
        ></v-text-field>
      </v-card-title>

      <v-data-table-server
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="items"
        :items-per-page="dictionaryWordsPerPage"
        :items-length="totalItems"
        :loading="isLoading"
        hide-default-footer
        item-value="id"
        loading-text="Загружаем словарь..."
        no-data-text="Слова не найдены"
        @update:options="dictionaryStore.loadDictionary"
      >
        <template #item.repeatCount="{item}">
          <v-chip
            :color="getRepeatBadgeColor(item)"
            :title="getRepeatBadgeTitle(item)"
            size="small"
            variant="tonal"
          >
            {{ item.repeatCount }}
          </v-chip>
        </template>
      </v-data-table-server>
    </v-card>
  </IAppLayout>
</template>
