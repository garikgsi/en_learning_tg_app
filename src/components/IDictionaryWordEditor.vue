<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue';
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRouter} from 'vue-router';
import {useUserStore} from '@/stores/userStore';
import {useDictionaryRepository} from '@/use/dictionaryRepository';
import {useNetwork} from '@/use/network';
import useMessages from '@/use/messages';
import {getApiErrorMessage} from '@/api/errors';
import type {ApiDictionaryWord, DictionaryUpdatePayload} from '@/api/types/dictionary';

const props = defineProps<{wordId: string}>();
const router = useRouter();
const userStore = useUserStore();
const repository = useDictionaryRepository();
const {isConnected} = useNetwork();
const {add} = useMessages();
const form = ref<{validate: () => Promise<{valid: boolean}>} | null>(null);
const word = ref<ApiDictionaryWord | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const error = ref('');
const baseline = ref('');
const draft = reactive({
  english: '',
  russian: '',
  englishVariants: [] as string[],
  russianVariants: [] as string[],
});
const variantSearch = reactive({englishVariants: '', russianVariants: ''});
const sections = [
  {primary: 'english', variants: 'englishVariants', label: 'Основное слово на английском', variantLabel: 'Варианты на английском', lang: 'en'},
  {primary: 'russian', variants: 'russianVariants', label: 'Основное слово на русском', variantLabel: 'Варианты на русском', lang: 'ru'},
] as const;
const variantValues = (section: typeof sections[number]) => [
  ...draft[section.variants],
  ...(variantSearch[section.variants].trim() ? [variantSearch[section.variants]] : []),
].map(value => value.trim());
const payload = computed<DictionaryUpdatePayload>(() => ({
  english: draft.english.trim(),
  russian: draft.russian.trim(),
  englishVariants: variantValues(sections[0]),
  russianVariants: variantValues(sections[1]),
}));
const hasChanges = computed(() => !!word.value && JSON.stringify(payload.value) !== baseline.value);
const previewEnglish = computed(() => [payload.value.english, ...payload.value.englishVariants].filter(Boolean).join('; '));
const previewRussian = computed(() => [payload.value.russian, ...payload.value.russianVariants].filter(Boolean).join('; '));
const required = (value: string) => !!value.trim() || 'Введите значение';
const maxLength = (value: string) => value.length <= 255 || 'Не больше 255 символов';
const allowedCharacters = (value: string) => /^[\p{L}() ,'!?-]+$/u.test(value.trim()) || 'Допустимы буквы, пробелы, скобки, запятые, дефисы, апострофы, ! и ?';
const validateVariants = (section: typeof sections[number]): true | string => {
  const values = variantValues(section);
  if (values.length > 50) return 'Не больше 50 вариантов';
  for (const value of values) {
    for (const rule of [required, maxLength, allowedCharacters]) {
      const result = rule(value);
      if (result !== true) return result;
    }
  }
  const normalized = [draft[section.primary].trim(), ...values].map(value => value.toLocaleLowerCase());
  return new Set(normalized).size === normalized.length || 'Такое значение уже есть';
};

const loadWord = async (wordId = props.wordId): Promise<void> => {
  isLoading.value = true;
  error.value = '';
  word.value = null;
  try {
    const response = await repository.getWord(Number(wordId));
    word.value = response.item;
    Object.assign(draft, {
      english: response.item.en,
      russian: response.item.ru,
      englishVariants: [...response.item.enVariants],
      russianVariants: [...response.item.ruVariants],
    });
    variantSearch.englishVariants = '';
    variantSearch.russianVariants = '';
    baseline.value = JSON.stringify(payload.value);
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Не удалось загрузить слово');
  } finally {
    isLoading.value = false;
  }
};

const save = async (): Promise<void> => {
  if (isSaving.value || !hasChanges.value || !userStore.isAdmin || !isConnected.value) return;
  if (!(await form.value?.validate())?.valid || isSaving.value) return;
  if (!userStore.user || !word.value) return;
  isSaving.value = true;
  error.value = '';
  try {
    await repository.updateWord(userStore.user.id, word.value.id, payload.value);
    baseline.value = JSON.stringify(payload.value);
    add('Значения слова сохранены');
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Не удалось сохранить слово');
    return;
  } finally {
    isSaving.value = false;
  }
  await router.push('/dictionary');
};

const isDiscardDialogOpen = ref(false);
let resolveDiscard: ((discard: boolean) => void) | null = null;
const confirmLeave = (): boolean | Promise<boolean> => {
  if (isSaving.value) return false;
  if (!hasChanges.value) return true;
  isDiscardDialogOpen.value = true;
  return new Promise(resolve => { resolveDiscard = resolve; });
};
const answerDiscard = (discard: boolean): void => {
  isDiscardDialogOpen.value = false;
  resolveDiscard?.(discard);
  resolveDiscard = null;
};
onBeforeRouteLeave(confirmLeave);
onBeforeRouteUpdate(async to => {
  if (!(await confirmLeave())) return false;
  await loadWord(String(to.params.wordId));
});
onMounted(() => {
  if (userStore.isAdmin) void loadWord();
});
</script>

<template>
  <div class="word-editor mx-auto">
    <div class="word-editor__header mb-5">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/dictionary" :disabled="isSaving">К словарю</v-btn>
      <v-chip v-if="hasChanges" size="small" variant="tonal" color="primary">Есть изменения</v-chip>
    </div>

    <v-alert v-if="!userStore.isAdmin" type="error" variant="tonal">Редактирование доступно только администраторам.</v-alert>
    <template v-else>
      <v-skeleton-loader v-if="isLoading" type="article, article" />
      <v-alert v-if="error" class="mb-4" type="error" variant="tonal">
        {{ error }}
        <v-btn v-if="!word" class="mt-2" variant="tonal" @click="loadWord()">Попробовать снова</v-btn>
      </v-alert>

      <v-form v-if="word && !isLoading" ref="form" :disabled="isSaving" @submit.prevent="save">
        <div class="mb-4">
          <div class="d-flex align-center ga-2 mb-2">
            <v-chip size="x-small" variant="tonal" color="success">{{ word.grade }}-й класс</v-chip>
          </div>
          <h1 class="text-h5 font-weight-medium">Значения слова</h1>
          <p class="text-body-2 text-medium-emphasis mt-2">Изменения будут доступны всем пользователям этого слова.</p>
        </div>

        <v-alert v-if="!isConnected" class="mb-4" type="info" variant="tonal">Для сохранения нужно подключение к интернету. Введённые значения остаются на странице.</v-alert>

        <div class="word-editor__fields">
          <template v-for="section in sections" :key="section.primary">
          <v-text-field
            v-model="draft[section.primary]"
            :label="section.label"
            :lang="section.lang"
            :rules="[required, maxLength, allowedCharacters]"
            maxlength="255"
            variant="outlined"
            density="default"
            hide-details="auto"
          />
          <v-combobox
            v-model="draft[section.variants]"
            v-model:search="variantSearch[section.variants]"
            :label="section.variantLabel"
            :lang="section.lang"
            :rules="[() => validateVariants(section)]"
            :items="[]"
            :return-object="false"
            multiple
            chips
            closable-chips
            hide-no-data
            menu-icon=""
            variant="outlined"
            density="default"
            hide-details="auto"
            @keydown.enter.stop
          >
            <template #chip="{item, props: chipProps}">
              <v-chip v-bind="chipProps" color="primary" variant="tonal" size="small" closable>{{ item.title }}</v-chip>
            </template>
          </v-combobox>
          </template>
        </div>

        <div class="text-body-2 text-medium-emphasis mt-3">Транскрипция: <span lang="en">{{ word.transcription || '—' }}</span></div>

        <v-card class="mt-4" variant="tonal" color="primary">
          <v-card-text>
            <div class="text-overline mb-2">Предпросмотр</div>
            <div class="text-body-1 font-weight-medium word-editor__preview" lang="en">{{ previewEnglish || 'Английское значение' }}</div>
            <div class="text-body-1 mt-1 word-editor__preview">{{ previewRussian || 'Русский перевод' }}</div>
          </v-card-text>
        </v-card>

        <div class="word-editor__actions mt-4">
          <v-btn variant="tonal" to="/dictionary" :disabled="isSaving">Отмена</v-btn>
          <v-btn color="primary" prepend-icon="mdi-check" type="submit" :disabled="!hasChanges || !isConnected" :loading="isSaving">Сохранить</v-btn>
        </div>
      </v-form>
    </template>

    <v-dialog v-model="isDiscardDialogOpen" max-width="420" persistent>
      <v-card title="Оставить изменения?">
        <v-card-text>Вы изменили значения слова. При выходе без сохранения изменения потеряются.</v-card-text>
        <v-card-actions class="flex-wrap">
          <v-btn @click="answerDiscard(false)">Продолжить редактирование</v-btn>
          <v-btn color="primary" @click="answerDiscard(true)">Выйти без сохранения</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.word-editor { max-width: 720px; }
.word-editor__header, .word-editor__actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.word-editor__fields { display: grid; gap: 20px; }
:deep(.v-combobox .v-chip__content) { white-space: normal; overflow-wrap: anywhere; }
:deep(.v-combobox .v-chip) { height: auto; min-height: 26px; }
.word-editor__preview { overflow-wrap: anywhere; }
.word-editor__actions { justify-content: flex-end; }
@media (max-width: 599px) {
  .word-editor__actions .v-btn { flex: 1; }
}
</style>
