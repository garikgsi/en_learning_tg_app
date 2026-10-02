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
import {selectWeeklyUncompletedExercises} from '@/use/weeklyExercises';
import {exerciseEnCoinReward} from '@/use/exerciseReward';
import {useNetwork} from '@/use/network';
import {getLeastRecentlyVisitedGame} from '@/use/gameVisits';
import {useUserStore} from '@/stores/userStore';
import robotHappy from '@/components/games/grammar-race/assets/robot-happy.png';

type Props = {
  exerciseId?: string
}

const props = defineProps<Props>();
const translateStore = useTranslateStore();
const statisticsStore = useStatisticsStore();
const dictionaryStore = useDictionaryStore();
const userStore = useUserStore();
const {wordList, currentExercises} = storeToRefs(translateStore);
const {isCreating, items: statisticsItems} = storeToRefs(statisticsStore);
const {isConnected} = useNetwork();
const router = useRouter();
const route = useRoute();
const recommendedGame = computed(() => getLeastRecentlyVisitedGame(
  userStore.user?.id ?? 'guest',
  userStore.user?.grade ?? 0,
));

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

const weeklyUncompletedExercises = computed<ExerciseStatisticsItem[]>(() => (
  selectWeeklyUncompletedExercises(statisticsItems.value)
));

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
      await statisticsStore.loadWeek(new Date());
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

const uncompletedExerciseWords = (exercise: ExerciseStatisticsItem) => {
  return exercise.words.map(word => ({
    id: word.wordId,
    en: word.english,
    ru: formatStatisticsWordTranslation({
      ...word,
      isUncompleted: true,
    }),
    color: 'grey',
  }));
}

const exerciseDateLabel = (value: string): string => {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value));
}

const exerciseReward = (
  exercise: Pick<Exercise, 'type' | 'dueDate'>
    | Pick<ExerciseStatisticsItem, 'type' | 'date'>,
): number => {
  const dueDate = 'dueDate' in exercise ? exercise.dueDate : exercise.date;

  return exerciseEnCoinReward(exercise.type.name, dueDate);
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
          <v-chip
            v-if="exerciseReward(exercise) > 0"
            class="exercise-card__reward"
            label
            size="large"
            variant="flat"
          >
            <v-icon icon="mdi-circle-multiple-outline" size="20"></v-icon>
            <strong>+{{ exerciseReward(exercise) }}</strong>
            <span>EnCoin</span>
          </v-chip>
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
      <div
        v-if="weeklyUncompletedExercises.length > 0"
        class="weekly-exercises"
      >
        <div>
          <h2 class="text-h6 font-weight-bold">
            Непройденные упражнения этой недели
          </h2>
          <div class="text-body-2 text-medium-emphasis mt-1">
            Сегодня новых заданий нет, но можно закончить предыдущие.
          </div>
        </div>

        <div class="exercise-cards">
          <v-card
            v-for="(exercise, index) in weeklyUncompletedExercises"
            :key="`${exercise.exerciseId}-${exercise.createdAt}-${index}`"
            class="exercise-card"
            variant="outlined"
          >
            <v-card-title>{{ exerciseTitle(exercise) }}</v-card-title>
            <v-card-subtitle class="text-warning">
              Не пройдено · {{ exerciseDateLabel(exercise.date) }}
            </v-card-subtitle>
            <v-card-text>
              <IChipWordList
                :limit="20"
                :words="uncompletedExerciseWords(exercise)"
                @play="dictionaryStore.playWordAudio"
              />
            </v-card-text>
            <v-card-actions>
              <v-chip
                v-if="exerciseReward(exercise) > 0"
                class="exercise-card__reward"
                label
                size="large"
                variant="flat"
              >
                <v-icon icon="mdi-circle-multiple-outline" size="20"></v-icon>
                <strong>+{{ exerciseReward(exercise) }}</strong>
                <span>EnCoin</span>
              </v-chip>
              <v-spacer />
              <v-btn
                color="primary"
                @click="startExercise(exercise.exerciseId)"
              >
                Пройти упражнение
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>
      </div>

      <v-alert
        v-else
        icon="mdi-check-circle-outline"
        title="Все упражнения пройдены"
        type="success"
        variant="tonal"
      >
        На сегодня непройденных упражнений не осталось.
      </v-alert>

      <v-card class="game-recommendation" elevation="0">
        <div class="game-recommendation__sparkles" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </div>
        <img
          alt="Радостный робот приглашает поиграть"
          class="game-recommendation__robot"
          :src="robotHappy"
        >
        <div class="game-recommendation__content">
          <div class="game-recommendation__eyebrow">
            <v-icon icon="mdi-gamepad-variant" size="18"></v-icon>
            Время для игры
          </div>
          <v-card-title class="game-recommendation__title">
            Давай немного поиграем - это возможность заработать пару монеток
          </v-card-title>
          <v-card-text class="game-recommendation__details">
            <strong>{{ recommendedGame.title }}</strong>
            <span>{{ recommendedGame.slogan }}</span>
          </v-card-text>
          <v-btn
            append-icon="mdi-arrow-right"
            class="game-recommendation__button"
            :to="recommendedGame.route"
            variant="flat"
          >
            Поехали
          </v-btn>
        </div>
      </v-card>

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

.exercise-card__reward {
  background: #f8cf54 !important;
  border: 1px solid #d89a12;
  border-radius: 999px !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 4px 10px rgba(151, 99, 0, 0.22);
  color: #513500 !important;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.exercise-card__reward :deep(.v-chip__content) {
  gap: 5px;
}

.exercise-card__reward :deep(.v-icon) {
  background: #fff0a3;
  border: 1px solid rgba(138, 87, 0, 0.24);
  border-radius: 50%;
  color: #8a5700;
  padding: 2px;
}

.exercise-card__reward strong {
  font-size: 1rem;
  font-weight: 900;
}

.exercises-completed {
  display: grid;
  gap: 16px;
}

.weekly-exercises {
  display: grid;
  gap: 12px;
}

.game-recommendation {
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.92), transparent 25%),
    linear-gradient(135deg, #fff0f6 0%, #f1e7ff 52%, #ffe5dc 100%);
  border: 1px solid rgba(126, 71, 164, 0.16);
  border-radius: 0;
  box-shadow: 0 16px 36px rgba(91, 52, 116, 0.16) !important;
  min-height: 250px;
  overflow: hidden;
  position: relative;
}

.game-recommendation::after {
  background: rgba(255, 255, 255, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 50%;
  content: '';
  height: 260px;
  position: absolute;
  right: -64px;
  top: -78px;
  width: 260px;
}

.game-recommendation__content {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 250px;
  padding: 22px 210px 22px 24px;
  position: relative;
  z-index: 2;
}

.game-recommendation__eyebrow {
  align-items: center;
  color: #7b3fc6;
  display: flex;
  font-size: 0.76rem;
  font-weight: 900;
  gap: 6px;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.game-recommendation__title {
  color: #40204f;
  font-size: clamp(1.15rem, 3vw, 1.58rem);
  font-weight: 900;
  line-height: 1.2;
  padding: 0;
  white-space: normal;
}

.game-recommendation__details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 16px 0 18px;
}

.game-recommendation__details strong {
  color: #7b3fc6;
  font-size: 1.13rem;
}

.game-recommendation__details span {
  color: #5e4268;
  font-size: 0.97rem;
  line-height: 1.35;
}

.game-recommendation__button {
  align-self: flex-start;
  background: #7b3fc6 !important;
  box-shadow: 0 8px 18px rgba(123, 63, 198, 0.28);
  color: #fff !important;
  font-weight: 900;
  margin-top: auto;
  min-width: 142px;
}

.game-recommendation__robot {
  bottom: -25px;
  height: 230px;
  object-fit: contain;
  position: absolute;
  right: 8px;
  width: 200px;
  z-index: 2;
}

.game-recommendation__sparkles {
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 1;
}

.game-recommendation__sparkles i {
  animation: recommendation-sparkle 2.4s ease-in-out infinite;
  background: #d44c8e;
  border-radius: 50%;
  height: 8px;
  position: absolute;
  width: 8px;
}

.game-recommendation__sparkles i:nth-child(1) { left: 4%; top: 16%; }
.game-recommendation__sparkles i:nth-child(2) { animation-delay: -0.7s; height: 5px; left: 48%; top: 13%; width: 5px; }
.game-recommendation__sparkles i:nth-child(3) { animation-delay: -1.2s; background: #8b50cf; left: 58%; top: 72%; }
.game-recommendation__sparkles i:nth-child(4) { animation-delay: -1.7s; background: #ed7a63; height: 6px; left: 72%; top: 18%; width: 6px; }
.game-recommendation__sparkles i:nth-child(5) { animation-delay: -0.35s; background: #8b50cf; left: 94%; top: 66%; }

@keyframes recommendation-sparkle {
  0%, 100% { opacity: 0.35; transform: scale(0.72); }
  50% { opacity: 1; transform: scale(1.3); }
}

@media (max-width: 600px) {
  .game-recommendation {
    min-height: 285px;
  }

  .game-recommendation__content {
    min-height: 285px;
    padding: 18px 116px 20px 18px;
  }

  .game-recommendation__title {
    font-size: 1.08rem;
  }

  .game-recommendation__details {
    padding-block: 12px 14px;
  }

  .game-recommendation__details strong {
    font-size: 1rem;
  }

  .game-recommendation__details span {
    font-size: 0.9rem;
  }

  .game-recommendation__robot {
    bottom: -10px;
    height: 166px;
    right: -20px;
    width: 145px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .game-recommendation__sparkles i {
    animation: none;
  }
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
