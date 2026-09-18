<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref} from 'vue';
import {onBeforeRouteLeave, useRouter} from 'vue-router';
import {useDate} from 'vuetify';
import IChipWord from '@/components/IChipWord.vue';
import {httpAdminExerciseDriver} from '@/api/http/adminExercise';
import type {AssignmentUser} from '@/api/http/adminExercise';
import type {ApiDictionaryWord} from '@/api/types/dictionary';
import {getApiErrorMessage} from '@/api/errors';
import {useUserStore} from '@/stores/userStore';
import {useDictionaryStore} from '@/stores/dictionaryStore';
import {useNetwork} from '@/use/network';
import useMessages from '@/use/messages';

const router = useRouter();
const userStore = useUserStore();
const dictionaryStore = useDictionaryStore();
const {isConnected} = useNetwork();
const {add} = useMessages();
const users = ref<AssignmentUser[]>([]);
const user = ref<AssignmentUser | null>(null);
const words = ref<ApiDictionaryWord[]>([]);
const matches = ref<ApiDictionaryWord[]>([]);
const search = ref('');
const replaceExisting = ref(false);
const dateAdapter = useDate();
const assignmentDate = ref<Date | null>(new Date());
const isDateDialogOpen = ref(false);
const dueDate = computed(() => assignmentDate.value && dateAdapter.isValid(assignmentDate.value) ? dateAdapter.toISO(assignmentDate.value) : '');
const dateText = computed(() => dueDate.value && assignmentDate.value ? assignmentDate.value.toLocaleDateString('ru-RU') : '');
const isUsersLoading = ref(false);
const isSearching = ref(false);
const isSaving = ref(false);
const usersError = ref('');
const searchError = ref('');
const saveError = ref('');
const totalMatches = ref(0);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchSequence = 0;
let saved = false;

const userTitle = (item: AssignmentUser) => `${item.name} · ${item.phone}`;
const wordTitle = (item: ApiDictionaryWord) => `${item.en} — ${item.ru}`;
const wordItems = computed(() => [...words.value, ...matches.value.filter(item => !words.value.some(word => word.id === item.id))]);
const canSave = computed(() => userStore.isAdmin && !!user.value && !!dueDate.value && words.value.length > 0 && words.value.length <= 100 && isConnected.value && !isSaving.value);

const loadUsers = async () => {
  isUsersLoading.value = true;
  usersError.value = '';
  try {
    users.value = await httpAdminExerciseDriver.getUsers();
  } catch (cause) {
    usersError.value = getApiErrorMessage(cause, 'Не удалось загрузить пользователей');
  } finally {
    isUsersLoading.value = false;
  }
};

const searchWords = (value: string) => {
  search.value = value;
  clearTimeout(searchTimer);
  const sequence = ++searchSequence;
  matches.value = [];
  totalMatches.value = 0;
  searchError.value = '';
  if (!userStore.isAdmin || !isConnected.value) {
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
  searchTimer = setTimeout(async () => {
    try {
      const response = await httpAdminExerciseDriver.searchWords(value.trim());
      if (sequence === searchSequence) {
        matches.value = response.items;
        totalMatches.value = response.total;
      }
    } catch (cause) {
      if (sequence === searchSequence) searchError.value = getApiErrorMessage(cause, 'Не удалось найти слова');
    } finally {
      if (sequence === searchSequence) isSearching.value = false;
    }
  }, 250);
};

const selectWords = async (selected: ApiDictionaryWord[]) => {
  words.value = selected.slice(0, 100);
  await nextTick();
  searchWords('');
};

const save = async () => {
  if (!canSave.value || !user.value) return;
  isSaving.value = true;
  saveError.value = '';
  try {
    const result = await httpAdminExerciseDriver.assign({
      userId: user.value.id,
      wordIds: words.value.map(word => word.id),
      dueDate: dueDate.value,
      replaceExisting: replaceExisting.value,
    });
    saved = true;
    add(result.wasReplaced ? `Задание пользователя на ${dateText.value} заменено` : `Дейли-задание на ${dateText.value} создано`);
  } catch (cause) {
    saveError.value = getApiErrorMessage(cause, 'Не удалось создать задание');
    return;
  } finally {
    isSaving.value = false;
  }
  await router.push('/statistics');
};

const isDiscardOpen = ref(false);
let resolveDiscard: ((value: boolean) => void) | null = null;
onBeforeRouteLeave(() => {
  if (isSaving.value) return false;
  if (saved || (!user.value && !words.value.length)) return true;
  isDiscardOpen.value = true;
  return new Promise<boolean>(resolve => { resolveDiscard = resolve; });
});
const answerDiscard = (discard: boolean) => {
  isDiscardOpen.value = false;
  resolveDiscard?.(discard);
  resolveDiscard = null;
};
onMounted(() => {
  if (userStore.isAdmin) {
    void loadUsers();
    searchWords('');
  }
});
onBeforeUnmount(() => { clearTimeout(searchTimer); searchSequence++; });
</script>

<template>
  <div class="daily-assignment mx-auto">
    <v-btn class="mb-4" variant="text" prepend-icon="mdi-arrow-left" to="/statistics" :disabled="isSaving">К статистике</v-btn>
    <v-alert v-if="!userStore.isAdmin" type="error" variant="tonal">Создание заданий доступно только администраторам.</v-alert>
    <v-card v-else variant="outlined">
      <v-card-text class="pa-5 pa-sm-6">
        <div class="d-flex align-center ga-2 mb-3">
          <v-chip size="small" variant="tonal" color="primary">Daily</v-chip>
          <span class="text-caption text-medium-emphasis">На {{ dateText }}</span>
        </div>
        <h1 class="text-h5 mb-2">Новое задание</h1>
        <p class="text-body-2 text-medium-emphasis mb-6">Выберите пользователя и соберите слова для его дейли-задания.</p>
        <v-alert v-if="!isConnected" type="info" variant="tonal" class="mb-4">Для поиска и создания задания нужно подключение к интернету.</v-alert>
        <v-alert v-if="usersError" type="error" variant="tonal" class="mb-4">
          {{ usersError }}
          <v-btn variant="text" :loading="isUsersLoading" @click="loadUsers">Повторить</v-btn>
        </v-alert>
        <v-form :disabled="isSaving" @submit.prevent="save">
          <v-dialog v-model="isDateDialogOpen" max-width="360">
            <template #activator="{props}">
              <v-text-field
                v-bind="props"
                :model-value="dateText"
                label="Дата задания"
                prepend-inner-icon="mdi-calendar-outline"
                variant="outlined"
                readonly
                :disabled="isSaving"
                hint="По умолчанию — сегодня. Нажмите, чтобы выбрать другую дату."
                persistent-hint
                class="mb-3"
              />
            </template>
            <v-date-picker
              v-model="assignmentDate"
              title="Дата задания"
              color="primary"
              width="100%"
              :first-day-of-week="1"
              hide-header
              @update:model-value="isDateDialogOpen = false"
            />
          </v-dialog>
          <v-autocomplete
            v-model="user"
            :items="users"
            :item-title="userTitle"
            item-value="id"
            return-object
            label="Пользователь"
            prepend-inner-icon="mdi-account-outline"
            variant="outlined"
            :loading="isUsersLoading"
            no-data-text="Пользователи не найдены"
            clearable
          >
            <template #item="{props, item}">
              <v-list-item v-bind="props" :title="item.raw.name" :subtitle="`${item.raw.phone}${item.raw.grade === null ? '' : ` · ${item.raw.grade}-й класс`}`" />
            </template>
          </v-autocomplete>

          <div class="text-subtitle-1 font-weight-medium mb-3">Слова задания</div>
          <v-autocomplete
            :model-value="words"
            :search="search"
            :items="wordItems"
            :item-title="wordTitle"
            item-value="id"
            return-object
            multiple
            no-filter
            hide-selected
            label="Поиск слов"
            placeholder="На русском или английском"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            :loading="isSearching"
            :disabled="isSaving || !isConnected || words.length >= 100"
            :no-data-text="isSearching ? 'Ищем слова…' : 'Слова не найдены'"
            :hint="totalMatches > 30 ? 'Показаны первые 30 результатов. Уточните запрос.' : 'Можно добавлять словосочетания и слова любого класса.'"
            persistent-hint
            @update:search="searchWords"
            @update:model-value="selectWords"
          >
            <template #selection />
            <template #item="{props, item}">
              <v-list-item v-bind="props" :title="item.raw.en" :subtitle="[item.raw.ru, ...item.raw.ruVariants].join('; ')" />
            </template>
          </v-autocomplete>
          <v-alert v-if="searchError" type="error" variant="tonal" class="mt-3">{{ searchError }}</v-alert>
          <div class="daily-assignment__words my-5">
            <div class="d-flex justify-space-between ga-2 mb-3">
              <span class="text-subtitle-2">Выбрано слов: {{ words.length }}</span>
              <span class="text-caption text-medium-emphasis">До 100 слов</span>
            </div>
            <p v-if="!words.length" class="text-body-2 text-medium-emphasis">Добавьте слова из результатов поиска — они появятся здесь.</p>
            <div v-else class="daily-assignment__chips">
              <IChipWord
                v-for="word in words"
                :key="word.id"
                :word="word.en"
                :translation="[word.ru, ...word.ruVariants].join('; ')"
                :transcription="word.transcription"
                :word-id="word.id"
                language="en"
                color="grey"
                :closable="!isSaving"
                @close="words = words.filter(item => item.id !== word.id)"
                @play="dictionaryStore.playWordAudio"
              />
            </div>
          </div>

          <v-divider class="mb-3" />
          <v-checkbox v-model="replaceExisting" label="Заменить задание пользователя на выбранную дату" hide-details />
          <p class="text-body-2 text-medium-emphasis mb-5">Если дейли-задание на {{ dateText }} ещё не пройдено, заменим его слова. Если таких заданий несколько, заменим последнее. В остальных случаях создадим новое задание.</p>
          <v-alert v-if="saveError" type="error" variant="tonal" class="mb-4">{{ saveError }}</v-alert>
          <div class="daily-assignment__actions">
            <v-btn variant="text" to="/statistics" :disabled="isSaving">Отмена</v-btn>
            <v-btn type="submit" color="primary" prepend-icon="mdi-plus" :disabled="!canSave" :loading="isSaving">Создать задание</v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
    <v-dialog v-model="isDiscardOpen" max-width="420" persistent>
      <v-card title="Выйти без создания задания?">
        <v-card-text>Выбранный пользователь и набор слов не сохранятся.</v-card-text>
        <v-card-actions class="flex-wrap">
          <v-btn @click="answerDiscard(false)">Продолжить</v-btn>
          <v-btn color="primary" @click="answerDiscard(true)">Выйти</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.daily-assignment { max-width: 760px; }
.daily-assignment__words { border: 1px solid rgba(var(--v-theme-on-surface), 0.12); border-radius: 12px; padding: 16px; }
.daily-assignment__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.daily-assignment__actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.daily-assignment :deep(.v-autocomplete__selection-text) { white-space: normal; overflow-wrap: anywhere; }
@media (max-width: 599px) {
  .daily-assignment__actions { flex-direction: column-reverse; align-items: stretch; }
  .daily-assignment__actions .v-btn { width: 100%; }
}
</style>
