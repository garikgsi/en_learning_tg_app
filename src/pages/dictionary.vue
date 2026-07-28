<script setup lang="ts">
import {onMounted} from 'vue';
import {storeToRefs} from 'pinia';
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

onMounted(async () => {
  await dictionaryStore.loadDictionary();
});

const headers = [
  {
    title: 'Русское слово',
    key: 'russian',
  },
  {
    title: 'Английское слово',
    key: 'english',
  },
  {
    title: 'Повторения',
    key: 'repeatCount',
    align: 'end',
    width: 260,
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

const getRepetitionButtonTitle = (word: DictionaryWord) => {
  if (dictionaryStore.isWordSelectedForRepetition(word.id)) {
    return 'Добавлено в список на повторение';
  }

  return 'Добавить в список на повторение';
}
</script>

<template>
  <v-card>
    <v-card-text class="pb-2">
      <v-text-field
        :model-value="search"
        clearable
        density="compact"
        hide-details
        label="Поиск по словарю"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        @update:model-value="dictionaryStore.searchDictionary"
      ></v-text-field>
    </v-card-text>

    <v-data-table-server
      :sort-by="sortBy"
      :headers="headers"
      :items="items"
      :items-per-page="dictionaryWordsPerPage"
      :items-length="totalItems"
      :loading="isLoading"
      hide-default-header
      hide-default-footer
      item-value="id"
      loading-text="Загружаем словарь..."
      no-data-text="Слова не найдены"
      @update:sort-by="dictionaryStore.sortDictionary"
    >
      <template #item.repeatCount="{item}">
        <div class="repeat-actions">
          <v-chip
            :color="getRepeatBadgeColor(item)"
            :title="getRepeatBadgeTitle(item)"
            size="small"
            variant="tonal"
          >
            {{ item.repeatCount }}
          </v-chip>

          <v-btn
            class="repeat-button d-none d-sm-inline-flex"
            :class="{'repeat-button--selected': dictionaryStore.isWordSelectedForRepetition(item.id)}"
            :color="dictionaryStore.isWordSelectedForRepetition(item.id) ? 'success' : 'primary'"
            :disabled="dictionaryStore.isWordSelectedForRepetition(item.id)"
            prepend-icon="mdi-bell-plus-outline"
            size="small"
            :title="getRepetitionButtonTitle(item)"
            @click="dictionaryStore.addWordToRepetition(item.id)"
          >
            Повторить
          </v-btn>

          <v-btn
            :aria-label="getRepetitionButtonTitle(item)"
            class="repeat-button d-sm-none"
            :class="{'repeat-button--selected': dictionaryStore.isWordSelectedForRepetition(item.id)}"
            :color="dictionaryStore.isWordSelectedForRepetition(item.id) ? 'success' : 'primary'"
            :disabled="dictionaryStore.isWordSelectedForRepetition(item.id)"
            icon="mdi-bell-plus-outline"
            size="small"
            :title="getRepetitionButtonTitle(item)"
            @click="dictionaryStore.addWordToRepetition(item.id)"
          ></v-btn>
        </div>
      </template>
    </v-data-table-server>
  </v-card>
</template>

<style scoped>
.repeat-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.repeat-button--selected.v-btn--disabled {
  opacity: 1;
}
</style>
