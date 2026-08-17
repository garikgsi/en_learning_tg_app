<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import {useTheme} from 'vuetify';
import {use} from 'echarts/core';
import {CanvasRenderer} from 'echarts/renderers';
import {BarChart} from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import type {EChartsOption} from 'echarts';
import VChart from 'vue-echarts';
import IConfirmDialog from '@/components/IConfirmDialog.vue';
import {
  findStatisticsAchievement,
  useStatisticsStore,
} from '@/stores/statisticsStore';
import type {
  AttentionWord,
  ExerciseStatisticsChartPeriod,
  ExerciseStatisticsItem,
} from '@/api/types/statistics';
import {useUserStore} from '@/stores/userStore';
import useLoading from '@/use/loading'
import {useNetwork} from '@/use/network';

use([
  CanvasRenderer,
  BarChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
]);

type StatisticsCalendarEvent = ExerciseStatisticsItem & {
  id: string
  title: string
  start: Date
  end: Date
  allDay: true
  color: string
}

const {isLoading} = useLoading();

const statisticsStore = useStatisticsStore();
const userStore = useUserStore();
const {isConnected} = useNetwork();
const {
  items,
  charts,
  attentionWords,
  isCreating,
} = storeToRefs(statisticsStore);

const router = useRouter();
const theme = useTheme();

const calendarDate = ref<Date[]>([new Date()]);
const selectedEvent = ref<StatisticsCalendarEvent | null>(null);
const isExerciseDialogOpen = ref(false);
const isCreateDialogOpen = ref(false);

const isUserExercise = (event: ExerciseStatisticsItem): boolean => {
  return event.type.name === 'user';
}

const canOpenExercise = (event: ExerciseStatisticsItem): boolean => {
  return !isUserExercise(event) || event.status === 'uncompleted';
}

const exerciseDialogText = computed(() => {
  return selectedEvent.value?.status === 'completed'
    ? 'Вы хотите пройти упражнение еще раз?'
    : 'Пройти упражнение?';
});

const exerciseDialogTitle = computed(() => {
  const event = selectedEvent.value;

  if (!event) {
    return 'Упражнение';
  }

  if (isUserExercise(event)) {
    return event.type.title;
  }

  const type = `${event.type.name} ${event.type.title}`.toLowerCase();

  return type.includes('week') || type.includes('недел')
    ? 'Еженедельное упражнение'
    : 'Ежедневное упражнение';
});

const openExerciseDialog = (event: StatisticsCalendarEvent): void => {
  if (!canOpenExercise(event)) {
    return;
  }

  selectedEvent.value = event;
  isExerciseDialogOpen.value = true;
}

const closeExerciseDialog = (): void => {
  selectedEvent.value = null;
}

const startSelectedExercise = async (): Promise<void> => {
  const exerciseId = selectedEvent.value?.exerciseId;
  selectedEvent.value = null;

  if (!exerciseId) {
    return;
  }

  await router.push(`/exercises/${exerciseId}`);
}

const createUserExercise = async (): Promise<void> => {
  try {
    const exerciseId = await statisticsStore.createUserExercise();
    await router.push(`/exercises/${exerciseId}`);
  } catch {
    // The store exposes the API error in the page alert.
  }
}

const getRepetitionButtonTitle = (word: AttentionWord): string => {
  return word.isSelectedForRepetition
    ? 'Слово добавлено для повторения'
    : 'Добавить слово для повторения';
}

const isSameLocalDay = (first: Date, second: Date): boolean => {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

const successColor = (percentage: number): string => {
  if (percentage >= 90) {
    return 'green-lighten-1';
  }

  if (percentage >= 75) {
    return 'green';
  }

  if (percentage >= 50) {
    return 'green-darken-1';
  }

  if (percentage >= 25) {
    return 'green-darken-2';
  }

  return 'green-darken-3';
}

const buildChartOption = (
  period?: ExerciseStatisticsChartPeriod,
): EChartsOption => {
  const users = period?.users ?? [];
  const shouldZoom = users.length > 6;
  const themeColors = theme.current.value.colors;
  const chartTextColor = themeColors['on-surface-variant'];

  return {
    backgroundColor: 'transparent',
    color: [themeColors.success, themeColors.warning, themeColors.secondary],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      top: 0,
      textStyle: {
        color: chartTextColor,
      },
    },
    grid: {
      top: 86,
      right: 24,
      bottom: shouldZoom ? 92 : 64,
      left: 56,
    },
    xAxis: {
      type: 'category',
      data: users.map(user => user.userName),
      axisLabel: {
        color: chartTextColor,
        interval: 0,
        rotate: users.length > 4 ? 30 : 0,
      },
      axisLine: {
        lineStyle: {
          color: themeColors['surface-variant'],
        },
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: chartTextColor,
      },
      splitLine: {
        lineStyle: {
          color: themeColors['surface-variant'],
        },
      },
    },
    dataZoom: shouldZoom
      ? [
          {
            type: 'inside',
            startValue: 0,
            endValue: 5,
          },
          {
            type: 'slider',
            startValue: 0,
            endValue: 5,
            bottom: 16,
          },
        ]
      : [],
    series: [
      {
        name: 'Изучено слов',
        type: 'bar',
        data: users.map(user => user.learnedWords),
      },
      {
        name: 'Изучено слов, но надо повторить',
        type: 'bar',
        data: users.map(user => user.wordsToRepeat),
      },
      {
        name: 'Пройденные упражнения',
        type: 'bar',
        data: users.map(user => user.completedExercises),
      },
    ],
  };
}

const weekChartOption = computed<EChartsOption>(() => {
  return buildChartOption(charts.value?.week);
});

const monthChartOption = computed<EChartsOption>(() => {
  return buildChartOption(charts.value?.month);
});

const hasCompletedExercises = (
  period?: ExerciseStatisticsChartPeriod,
): boolean => {
  return period?.users.some(user => user.completedExercises > 0) ?? false;
}

const hasWeekExercises = computed(() => {
  return hasCompletedExercises(charts.value?.week);
});

const hasMonthExercises = computed(() => {
  return hasCompletedExercises(charts.value?.month);
});

const achievement = computed(() => {
  return findStatisticsAchievement(charts.value, userStore.user?.id);
});

const achievementMessage = computed(() => {
  const result = achievement.value;

  if (!result) {
    return '';
  }

  const periodOutcome = result.period === 'week'
    ? 'По итогам недели'
    : 'По итогам месяца';
  const periodAccusative = result.period === 'week'
    ? 'текущую неделю'
    : 'текущий месяц';

  if (result.place === 1) {
    if (result.criterion === 'learnedWords') {
      return `${periodOutcome} ты изучил больше всего слов, чем кто-либо.`;
    }

    if (result.criterion === 'wordsToRepeat') {
      return `${periodOutcome} у тебя больше всего изученных слов, которые надо повторить.`;
    }

    return `${periodOutcome} ты прошёл больше всего упражнений.`;
  }

  const criterionText = result.criterion === 'learnedWords'
    ? 'количеству изученных слов'
    : result.criterion === 'wordsToRepeat'
      ? 'количеству изученных слов, которые надо повторить'
      : 'количеству пройденных упражнений';

  return `Ты занял ${result.place} место среди всех пользователей по `
    + `${criterionText} за ${periodAccusative}.`;
});

const formatChartPeriod = (
  period?: ExerciseStatisticsChartPeriod,
): string => {
  if (!period) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  const toLocalDate = (value: string): Date => {
    const [year, month, day] = value
      .slice(0, 10)
      .split('-')
      .map(Number);

    return new Date(year, month - 1, day);
  }

  return `${formatter.format(toLocalDate(period.dateFrom))} — `
    + formatter.format(toLocalDate(period.dateTo));
}

const events = computed<StatisticsCalendarEvent[]>(() => {
  return items.value.map(item => {
    const date = new Date(item.date);
    const isUncompletedToday = item.status === 'uncompleted'
      && isSameLocalDay(date, new Date());

    return {
      ...item,
      id: item.completionId === null
        ? `exercise-${item.exerciseId}`
        : `completion-${item.completionId}`,
      title: isUserExercise(item)
        ? item.type.title
        : isUncompletedToday
          ? 'Задание на сегодня'
          : item.type.title,
      start: date,
      end: date,
      allDay: true,
      color: isUserExercise(item)
        ? 'grey-darken-1'
        : isUncompletedToday
          ? 'orange-darken-1'
          : item.status === 'uncompleted'
            ? 'red-darken-1'
            : successColor(item.successPercentage),
    };
  });
});

const visibleMonth = computed(() => {
  return calendarDate.value[0] ?? new Date();
});

watch(
  () => [
    visibleMonth.value.getFullYear(),
    visibleMonth.value.getMonth(),
  ],
  async () => {
    await statisticsStore.loadMonth(visibleMonth.value);
  },
);

watch(isConnected, async (connected, wasConnected) => {
  if (connected && wasConnected === false) {
    await statisticsStore.loadMonth(visibleMonth.value);
  }
});

onMounted(async () => {
  await statisticsStore.loadMonth(visibleMonth.value);
});
</script>

<template>

  <v-card class="statistics-card">
    <v-card-title class="statistics-card__header">

      <v-spacer></v-spacer>

      <v-btn
        color="primary"
        :disabled="isCreating"
        :loading="isCreating"
        prepend-icon="mdi-plus"
        variant="text"
        @click="isCreateDialogOpen = true"
      >
        Новое задание
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text class="pb-2">
      <div class="statistics-legend">
        <div class="statistics-legend__item">
          <span class="statistics-legend__color bg-orange-darken-1"></span>
          Задание на сегодня
        </div>
        <div class="statistics-legend__item">
          <span class="statistics-legend__color bg-red-darken-1"></span>
          Не пройдено
        </div>
        <div class="statistics-legend__item">
          <span class="statistics-legend__gradient"></span>
          Пройдено
        </div>
        <div class="statistics-legend__item">
          <span class="statistics-legend__color bg-grey-darken-1"></span>
          Пользовательское
        </div>
      </div>
    </v-card-text>

    <v-skeleton-loader
      v-if="isLoading"
      class="statistics-calendar-skeleton"
      type="table"
    ></v-skeleton-loader>

    <div
      v-else
      class="statistics-calendar-body"
    >
      <v-calendar
        v-model="calendarDate"
        class="statistics-calendar"
        :events="events"
        :first-day-of-week="1"
        :hide-week-number="true"
        :show-adjacent-months="false"
        view-mode="month"
      >
        <template #event="{event}">
          <v-tooltip location="top">
            <template #activator="{props}">
              <v-sheet
                v-bind="props"
                class="statistics-event"
                :class="{
                  'statistics-event--disabled': !canOpenExercise(
                    event as StatisticsCalendarEvent,
                  ),
                }"
                :color="event.color as string"
                :role="canOpenExercise(event as StatisticsCalendarEvent) ? 'button' : undefined"
                rounded="sm"
                :tabindex="canOpenExercise(event as StatisticsCalendarEvent) ? 0 : undefined"
                @click="openExerciseDialog(event as StatisticsCalendarEvent)"
                @keydown.enter="openExerciseDialog(event as StatisticsCalendarEvent)"
                @keydown.space.prevent="openExerciseDialog(event as StatisticsCalendarEvent)"
              >
                <div class="statistics-event__title">
                  {{ event.title }}
                </div>
                <div class="statistics-event__result">
                  {{ event.wordsCount }} / {{ event.wordsWithErrors }}
                </div>
              </v-sheet>
            </template>

            <div>{{ event.title }}</div>
            <div>
              Всего слов: {{ event.wordsCount }},
              с ошибками: {{ event.wordsWithErrors }}
            </div>
            <div v-if="event.status === 'completed'">
              Без ошибок: {{ event.successPercentage }}%
            </div>
            <div v-else>Упражнение не пройдено</div>
            <div
              v-if="
                isUserExercise(event as StatisticsCalendarEvent)
                  && event.status === 'completed'
              "
            >
              Отображается без оценки результата и недоступно для повторения
            </div>
          </v-tooltip>
        </template>
      </v-calendar>
    </div>
  </v-card>

  <v-alert
    v-if="achievement"
    class="statistics-achievement"
    density="compact"
    icon="mdi-trophy-outline"
    title="Поздравляем!"
    type="success"
    variant="tonal"
  >
    {{ achievementMessage }}
  </v-alert>

  <div
    v-if="isLoading || hasWeekExercises || hasMonthExercises"
    class="statistics-charts"
  >
    <v-card v-if="isLoading || hasWeekExercises">
      <v-card-title>Текущая неделя</v-card-title>
      <v-card-subtitle>
        {{ formatChartPeriod(charts?.week) }}
      </v-card-subtitle>
      <v-card-text>
        <v-skeleton-loader
          v-if="isLoading"
          height="380"
          type="image"
        ></v-skeleton-loader>
        <VChart
          v-else
          autoresize
          class="statistics-chart"
          :option="weekChartOption"
        />
      </v-card-text>
    </v-card>

    <v-card v-if="isLoading || hasMonthExercises">
      <v-card-title>Текущий месяц</v-card-title>
      <v-card-subtitle>
        {{ formatChartPeriod(charts?.month) }}
      </v-card-subtitle>
      <v-card-text>
        <v-skeleton-loader
          v-if="isLoading"
          height="380"
          type="image"
        ></v-skeleton-loader>
        <VChart
          v-else
          autoresize
          class="statistics-chart"
          :option="monthChartOption"
        />
      </v-card-text>
    </v-card>
  </div>

  <v-card
    v-if="isLoading || attentionWords.length"
    class="attention-card"
  >
    <v-card-title class="text-error">
      Слова, на которые стоит обратить внимание
    </v-card-title>

    <v-skeleton-loader
      v-if="isLoading"
      type="list-item-two-line@3"
    ></v-skeleton-loader>

    <v-list
      v-else-if="attentionWords.length"
      class="attention-list"
      :class="{
        'attention-list--columns': attentionWords.length > 10,
      }"
      lines="two"
    >
      <v-list-item
        v-for="word in attentionWords"
        :key="word.wordId"
        :subtitle="word.english"
        :title="word.russian"
      >
        <template #append>
          <div class="attention-word__actions">
            <v-chip
              color="error"
              size="small"
              variant="tonal"
            >
              <span class="d-none d-sm-inline">
                {{ word.errorPercentage }}% ошибок
              </span>
              <span class="d-sm-none">
                {{ word.errorPercentage }}%
              </span>
            </v-chip>

            <v-btn
              class="attention-repeat-button d-none d-sm-inline-flex"
              :class="{
                'attention-repeat-button--selected':
                  word.isSelectedForRepetition
              }"
              :color="word.isSelectedForRepetition ? 'success' : 'primary'"
              :disabled="
                word.isSelectedForRepetition
                  || statisticsStore.isAddingAttentionWord(word.wordId)
              "
              :loading="statisticsStore.isAddingAttentionWord(word.wordId)"
              prepend-icon="mdi-bell-plus-outline"
              size="small"
              :title="getRepetitionButtonTitle(word)"
              @click="
                statisticsStore.addAttentionWordToRepetition(word.wordId)
              "
            >
              Повторить
            </v-btn>

            <v-btn
              :aria-label="getRepetitionButtonTitle(word)"
              class="attention-repeat-button d-sm-none"
              :class="{
                'attention-repeat-button--selected':
                  word.isSelectedForRepetition,
              }"
              :color="word.isSelectedForRepetition ? 'success' : 'primary'"
              :disabled="
                word.isSelectedForRepetition
                  || statisticsStore.isAddingAttentionWord(word.wordId)
              "
              icon="mdi-bell-plus-outline"
              :loading="statisticsStore.isAddingAttentionWord(word.wordId)"
              size="small"
              :title="getRepetitionButtonTitle(word)"
              @click="
                statisticsStore.addAttentionWordToRepetition(word.wordId)
              "
            ></v-btn>
          </div>
        </template>
      </v-list-item>
    </v-list>

  </v-card>

  <IConfirmDialog
    v-model="isExerciseDialogOpen"
    no-button-text="Нет"
    :text="exerciseDialogText"
    :title="exerciseDialogTitle"
    yes-button-text="Да"
    @no="closeExerciseDialog"
    @yes="startSelectedExercise"
  />

  <IConfirmDialog
    v-model="isCreateDialogOpen"
    no-button-text="Нет"
    text="Создать пользовательское задание на текущую дату?"
    title="Новое задание"
    yes-button-text="Создать"
    @yes="createUserExercise"
  />
</template>

<style scoped>
.statistics-card {
  display: flex;
  flex-direction: column;
  height: 720px;
}

.statistics-card__header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.statistics-charts {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);
  margin-top: 16px;
}

.statistics-achievement {
  margin-top: 16px;
}

.statistics-chart {
  height: 380px;
  width: 100%;
}

.attention-card {
  margin-top: 16px;
}

.attention-list :deep(.v-list-item) {
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.attention-word__actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.attention-repeat-button--selected.v-btn--disabled {
  opacity: 1;
}

@media (min-width: 1280px) {
  .statistics-charts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .attention-list--columns {
    column-gap: 16px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1920px) {
  .attention-list--columns {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.statistics-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}

.statistics-legend__item {
  align-items: center;
  display: flex;
  gap: 8px;
}

.statistics-legend__color,
.statistics-legend__gradient {
  border-radius: 4px;
  display: inline-block;
  flex: 0 0 28px;
  height: 12px;
}

.statistics-legend__gradient {
  background: linear-gradient(
    90deg,
    #1b5e20,
    #66bb6a
  );
}

.statistics-calendar-skeleton,
.statistics-calendar-body {
  flex: 1 1 auto;
  min-height: 0;
}

.statistics-calendar-skeleton,
.statistics-calendar {
  height: 100%;
}

.statistics-calendar {
  display: flex;
  flex-direction: column;
}

.statistics-calendar :deep(.v-calendar__container) {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.statistics-calendar :deep(.v-calendar-month__days) {
  min-height: 0;
}

.statistics-calendar :deep(.v-calendar-month__day) {
  min-height: 0;
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday) {
  font-size: 0;
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday::after) {
  font-size: 11px;
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday:nth-child(1)::after) {
  content: 'пн';
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday:nth-child(2)::after) {
  content: 'вт';
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday:nth-child(3)::after) {
  content: 'ср';
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday:nth-child(4)::after) {
  content: 'чт';
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday:nth-child(5)::after) {
  content: 'пт';
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday:nth-child(6)::after) {
  content: 'сб';
}

.statistics-calendar :deep(.v-calendar-weekly__head-weekday:nth-child(7)::after) {
  content: 'вс';
}

.statistics-calendar :deep(.v-calendar-weekly__day-label__today) {
  background: #2e7d32 !important;
  color: white !important;
}

.statistics-event {
  color: white;
  cursor: pointer;
  margin: 2px 4px;
  overflow: hidden;
  padding: 4px 6px;
}

.statistics-event--disabled {
  cursor: default;
}

.statistics-event__title {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.statistics-event__result {
  font-size: 11px;
  opacity: 0.9;
}
</style>
