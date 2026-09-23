<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useRoute, useRouter} from 'vue-router';
import ITranslateTask from '@/components/ITranslateTask.vue';
import IChipWordList from '@/components/IChipWordList.vue';
import type {TranslationTask} from '@/types/translation';
import {useTranslateStore} from '@/stores/translateStore';
import {useStatisticsStore} from '@/stores/statisticsStore';
import {useDictionaryStore} from '@/stores/dictionaryStore';
import type {Exercise} from '@/api/types/exercise';
import type {ExerciseStatisticsItem} from '@/api/types/statistics';
import {formatStatisticsWordTranslation} from '@/use/statisticsCalendar';
import {useNetwork} from '@/use/network';

type Props = {
  exerciseId?: string
}

const props = defineProps<Props>();
const translateStore = useTranslateStore();
const statisticsStore = useStatisticsStore();
const dictionaryStore = useDictionaryStore();
const {wordList, currentExercises} = storeToRefs(translateStore);
const {isCreating, items: statisticsItems} = storeToRefs(statisticsStore);
const {isConnected} = useNetwork();
const router = useRouter();
const route = useRoute();

translateStore.clearWords();
const isLoadingExercises = ref(false);
const isCompletedExercisesVisible = ref(false);
const isExercisePage = computed(() => {
  const exerciseId = Number(props.exerciseId);

  return Number.isInteger(exerciseId) && exerciseId > 0;
});

const isToday = (value: string): boolean => {
  const date = new Date(value);
  const today = new Date();

  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

const completedExercises = computed<ExerciseStatisticsItem[]>(() => {
  const latestByExercise = new Map<number, ExerciseStatisticsItem>();

  statisticsItems.value
    .filter(item => item.status === 'completed')
    .filter(item => !['user', 'userPlural'].includes(item.type.name))
    .filter(item => isToday(item.date))
    .forEach(item => {
      const existing = latestByExercise.get(item.exerciseId);

      if (
        !existing
        || (item.completionId ?? 0) > (existing.completionId ?? 0)
      ) {
        latestByExercise.set(item.exerciseId, item);
      }
    });

  return [...latestByExercise.values()].sort((first, second) => {
    return new Date(first.createdAt).getTime()
      - new Date(second.createdAt).getTime();
  });
});

const continueQueueOrReturnToExercises = async (): Promise<void> => {
  if (wordList.value.length === 0) {
    const queue = typeof route.query.queue === 'string'
      ? route.query.queue
          .split(',')
          .map(Number)
          .filter(id => Number.isInteger(id) && id > 0)
      : [];
    const nextExerciseId = queue.shift();

    if (nextExerciseId) {
      await router.replace({
        path: `/exercises/${nextExerciseId}`,
        query: queue.length > 0 ? {queue: queue.join(',')} : undefined,
      });
      translateStore.clearWords();
      await translateStore.loadExercise(nextExerciseId);
      return;
    }

    await router.replace('/exercises');
  }
}

const loadPage = async (): Promise<void> => {
  const exerciseId = props.exerciseId
    ? Number(props.exerciseId)
    : Number.NaN;

  if (Number.isInteger(exerciseId) && exerciseId > 0) {
    const wasLoaded = await translateStore.loadExercise(exerciseId);

    if (wasLoaded) {
      await continueQueueOrReturnToExercises();
    }

    return;
  }

  isLoadingExercises.value = true;

  try {
    await translateStore.loadCurrentExercises();

    if (currentExercises.value.length === 0) {
      await statisticsStore.loadMonth(new Date());
    }
  } finally {
    isLoadingExercises.value = false;
  }
};

onMounted(async () => {
  await loadPage();
});

watch(() => props.exerciseId, async (exerciseId, previousExerciseId) => {
  if (exerciseId !== previousExerciseId) {
    translateStore.clearWords();
    await loadPage();
  }
});

watch(isConnected, async (connected, wasConnected) => {
  if (connected && wasConnected === false) {
    await loadPage();
  }
});

const completeExercise = async (tasks: TranslationTask[]): Promise<void> => {
  await translateStore.taskCompleted(tasks);
  await continueQueueOrReturnToExercises();
}

const exerciseTitle = (
  exercise: Pick<Exercise, 'type'> | Pick<ExerciseStatisticsItem, 'type'>,
): string => {
  if (exercise.type.name === 'daily') {
    return 'Перевод слов';
  }

  if (['plural', 'userPlural'].includes(exercise.type.name)) {
    return 'Множественное число';
  }

  if (exercise.type.name === 'weekly') {
    return 'Недельное задание';
  }

  if (exercise.type.name === 'user') {
    return 'Пользовательское задание';
  }

  return exercise.type.title || 'Задание';
}

const currentExerciseWords = (exercise: Exercise) => {
  return exercise.items.map(({word}) => ({
    id: word.id,
    en: word.en,
    ru: word.ru,
    color: 'grey',
  }));
}

const completedExerciseWords = (exercise: ExerciseStatisticsItem) => {
  return exercise.words.map(word => ({
    id: word.wordId,
    en: word.english,
    ru: formatStatisticsWordTranslation({
      ...word,
      isUncompleted: false,
    }),
    color: word.hasErrors ? 'red' : 'green',
  }));
}

const startExercise = async (exerciseId: number): Promise<void> => {
  await router.push(`/exercises/${exerciseId}`);
}

const createUserExercise = async (): Promise<void> => {
  try {
    const exerciseId = await statisticsStore.createUserExercise();
    await startExercise(exerciseId);
  } catch {
    // The store displays the API error.
  }
}
</script>

<template>

  <ITranslateTask
    v-if="isExercisePage && wordList.length > 0"
    @finish="completeExercise"
  />

  <template v-else-if="!isExercisePage">
    <v-skeleton-loader
      v-if="isLoadingExercises"
      type="card@3"
    />

    <div
      v-else-if="currentExercises.length > 0"
      class="exercise-cards"
    >
      <v-card
        v-for="exercise in currentExercises"
        :key="exercise.id"
        class="exercise-card"
        variant="outlined"
      >
        <v-card-title>{{ exerciseTitle(exercise) }}</v-card-title>
        <v-card-subtitle class="text-success">
          {{ ['plural', 'userPlural'].includes(exercise.type.name)
            ? 'исключения множественного числа'
            : 'словарный диктант' }}
        </v-card-subtitle>
        <v-card-text>
          <div>Приглашаем пройти задание и повторить изученные слова.</div>
          <IChipWordList
            class="mt-3"
            :limit="20"
            :words="currentExerciseWords(exercise)"
            @play="dictionaryStore.playWordAudio"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            @click="startExercise(exercise.id)"
          >
            Пройти упражнение
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <div
      v-else
      class="exercises-completed"
    >
      <v-alert
        icon="mdi-check-circle-outline"
        title="Все упражнения пройдены"
        type="success"
        variant="tonal"
      >
        На сегодня непройденных упражнений не осталось.
      </v-alert>

      <div class="exercises-completed__toggle-row">
        <v-btn
          v-if="completedExercises.length > 0"
          class="exercises-completed__toggle"
          color="grey"
          size="small"
          variant="plain"
          @click="isCompletedExercisesVisible = !isCompletedExercisesVisible"
        >
          {{ isCompletedExercisesVisible
            ? 'Скрыть пройденные'
            : 'Показать пройденные' }}
        </v-btn>
      </div>


      <v-expand-transition>
        <div
          v-if="isCompletedExercisesVisible"
          class="exercise-cards"
        >
          <v-card
            v-for="exercise in completedExercises"
            :key="exercise.exerciseId"
            class="exercise-card"
            variant="outlined"
          >
            <v-card-title>{{ exerciseTitle(exercise) }}</v-card-title>
            <v-card-subtitle class="text-success">
              уже пройдено
            </v-card-subtitle>
            <v-card-text>
              <IChipWordList
                :limit="20"
                :words="completedExerciseWords(exercise)"
                @play="dictionaryStore.playWordAudio"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="primary"
                @click="startExercise(exercise.exerciseId)"
              >
                Повторить
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>
      </v-expand-transition>

      <v-row>
        <v-col>
          <v-btn
            class="mr-4"
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-calendar-check"
            to="/statistics"
          >
            Статистика
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :disabled="isCreating"
            :loading="isCreating"
            prepend-icon="mdi-plus"
            @click="createUserExercise"
          >
            Новое упражнение
        </v-btn>
        </v-col>

      </v-row>



    </div>
  </template>

</template>

<style scoped>
.exercise-cards {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
}

.exercise-card {
  display: flex;
  flex-direction: column;
}

.exercise-card :deep(.v-card-actions) {
  margin-top: auto;
}

.exercises-completed {
  display: grid;
  gap: 16px;
}

.exercises-completed__actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  justify-content: flex-end;
}

.exercises-completed__actions > :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
}

.exercises-completed__toggle-row {
  display: flex;
  justify-content: flex-end;
}

.exercises-completed__toggle {
  font-weight: 400;
  letter-spacing: normal;
  text-transform: none;
}
</style>
