<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
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
  import IChipWord from '@/components/IChipWord.vue';
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
  import {
    buildStatisticsCalendarGroups,
    buildStatisticsExerciseQueue,
    findUncompletedUserExerciseForDay,
    limitStatisticsCalendarWords,
    selectStatisticsCalendarExercise,
  } from '@/use/statisticsCalendar';
  import type {
    StatisticsCalendarGroup,
  } from '@/use/statisticsCalendar';

use([
  CanvasRenderer,
  BarChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
]);

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
  const isCalendarLoading = ref(true);
  const selectedGroup = ref<StatisticsCalendarGroup | null>(null);
const isExerciseDialogOpen = ref(false);
const isCreateDialogOpen = ref(false);

  const selectedExerciseFor = (
    group: StatisticsCalendarGroup,
  ): ExerciseStatisticsItem | null => {
    return selectStatisticsCalendarExercise(group);
}

  const selectedEvent = computed<ExerciseStatisticsItem | null>(() => {
    return selectedGroup.value
      ? selectedExerciseFor(selectedGroup.value)
      : null;
});

const exerciseDialogTitle = computed(() => {
    const group = selectedGroup.value;

    if (!group) {
    return 'Упражнение';
  }

    if (group.typeName === 'user') {
      return 'Пользовательское упражнение';
  }

    return group.typeName === 'weekly'
    ? 'Еженедельное упражнение'
    : 'Ежедневное упражнение';
});

  const canStartSelectedGroup = computed(() => {
    return selectedGroup.value?.typeName !== 'user'
      || selectedEvent.value?.status === 'uncompleted';
  });

  const exerciseDialogText = computed(() => {
    if (!canStartSelectedGroup.value) {
      return '';
  }

    return selectedGroup.value?.typeName === 'user'
      ? 'Пройти упражнение?'
      : 'Пройти упражнение еще раз?';
  });

  const isSelectedUncompletedUserExercise = computed(() => {
    return selectedGroup.value?.typeName === 'user'
      && selectedGroup.value.status === 'uncompleted';
  });

  const selectedWordsSummary = computed(() => {
    return limitStatisticsCalendarWords(selectedGroup.value?.words ?? []);
  });

  const groupTitle = (group: StatisticsCalendarGroup): string => {
    return group.typeName === 'daily'
      ? 'Daily'
      : group.typeName === 'weekly'
        ? 'Weekly'
        : 'My';
  }

  const groupResultTitle = (group: StatisticsCalendarGroup): string => {
    const count = group.count === 1 ? '' : ` * ${group.count}`;
    const correctWords = group.wordsCount - group.wordsWithErrors;

    return `${groupTitle(group)}${count} (${correctWords}/${group.wordsCount})`;
  }

  const openExerciseDialog = (group: StatisticsCalendarGroup): void => {
    selectedGroup.value = group;
  isExerciseDialogOpen.value = true;
}

const closeExerciseDialog = (): void => {
    selectedGroup.value = null;
}

const startSelectedExercise = async (): Promise<void> => {
    const group = selectedGroup.value;
    const exerciseIds = group ? buildStatisticsExerciseQueue(group) : [];
    const exerciseId = exerciseIds.shift();
    selectedGroup.value = null;

  if (!exerciseId) {
    return;
  }

    await router.push({
      path: `/exercises/${exerciseId}`,
      query: exerciseIds.length > 0
        ? { queue: exerciseIds.join(',') }
        : undefined,
    });
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

  const events = computed<StatisticsCalendarGroup[]>(() => {
    return buildStatisticsCalendarGroups(items.value);
});

  const openUserExerciseCreation = async (): Promise<void> => {
    const existingGroup = findUncompletedUserExerciseForDay(
      events.value,
      new Date(),
    );
    const existingExerciseId = existingGroup
      ? buildStatisticsExerciseQueue(existingGroup)[0]
      : null;

    if (existingExerciseId) {
      await router.push(`/exercises/${existingExerciseId}`);
      return;
    }

    isCreateDialogOpen.value = true;
  }

const visibleMonth = computed(() => {
  return calendarDate.value[0] ?? new Date();
});

  let calendarLoadSequence = 0;

  const loadVisibleMonth = async (): Promise<void> => {
    const loadSequence = ++calendarLoadSequence;
    isCalendarLoading.value = true;

    try {
      await statisticsStore.loadMonth(visibleMonth.value);
      await nextTick();
    } finally {
      if (loadSequence === calendarLoadSequence) {
        isCalendarLoading.value = false;
      }
    }
  }

watch(
  () => [
    visibleMonth.value.getFullYear(),
    visibleMonth.value.getMonth(),
  ],
  async () => {
      await loadVisibleMonth();
  },
);

watch(isConnected, async (connected, wasConnected) => {
  if (connected && wasConnected === false) {
      await loadVisibleMonth();
  }
});

onMounted(async () => {
    await loadVisibleMonth();
});
</script>

<template>

  <v-card class="statistics-card">
    <v-card-title class="statistics-card__header">

      <v-spacer />

      <v-btn
        color="primary"
        :disabled="isCreating"
        :loading="isCreating"
        prepend-icon="mdi-plus"
        variant="text"
        @click="openUserExerciseCreation"
      >
        Новое задание
      </v-btn>
    </v-card-title>

    <v-divider />

    <v-card-text class="pb-2">
      <div class="statistics-legend">
        <div class="statistics-legend__item">
          <span class="statistics-legend__color bg-orange-darken-1" />
          Задание на сегодня
        </div>
        <div class="statistics-legend__item">
          <span class="statistics-legend__color bg-red-darken-1" />
          Не пройдено
        </div>
        <div class="statistics-legend__item">
          <span class="statistics-legend__gradient" />
          Пройдено
        </div>
        <div class="statistics-legend__item">
          <span class="statistics-legend__color bg-grey-darken-1" />
          Самоподготовка
        </div>
      </div>
    </v-card-text>

    <v-skeleton-loader
      v-if="isCalendarLoading"
      class="statistics-calendar-skeleton"
      type="table"
    />

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
        weeks-in-month="static"
      >
        <template #event="{event}">
          <v-tooltip location="top">
            <template #activator="{props}">
              <v-sheet
                v-bind="props"
                class="statistics-event"
                :class="{
                  'statistics-event--single-type': (
                    event as StatisticsCalendarGroup
                  ).isOnlyTypeInDay,
                }"
                :color="event.color as string"
                role="button"
                rounded="sm"
                :style="{
                  flexGrow: (event as StatisticsCalendarGroup).count,
                }"
                :tabindex="0"
                @click="openExerciseDialog(event as StatisticsCalendarGroup)"
                @keydown.enter="openExerciseDialog(
                  event as StatisticsCalendarGroup,
                )"
                @keydown.space.prevent="openExerciseDialog(
                  event as StatisticsCalendarGroup,
                )"
              >
                <div class="statistics-event__compact-title d-sm-none">
                  {{ (event as StatisticsCalendarGroup).shortTitle }}<span
                    v-if="(event as StatisticsCalendarGroup).count > 1"
                  >
                    {{ (event as StatisticsCalendarGroup).count }}
                  </span>
                </div>
                <div class="statistics-event__details d-none d-sm-flex">
                <div class="statistics-event__title">
                    {{ groupResultTitle(event as StatisticsCalendarGroup) }}
                </div>
                </div>
              </v-sheet>
            </template>

            <div>{{ event.title }}</div>
            <div v-if="(event as StatisticsCalendarGroup).count > 1">
              Упражнений: {{ (event as StatisticsCalendarGroup).count }}
            </div>
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
                (event as StatisticsCalendarGroup).typeName === 'user'
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
        />
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
        />
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
    />

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
            />
          </div>
        </template>
      </v-list-item>
    </v-list>

  </v-card>

  <v-dialog
    v-model="isExerciseDialogOpen"
    max-width="500"
    persistent
    scrollable
    @after-leave="closeExerciseDialog"
  >
    <v-card v-if="selectedGroup">
      <v-card-title>{{ exerciseDialogTitle }}</v-card-title>
      <v-divider />
      <v-card-text class="exercise-statistics-dialog__content">
        <div v-if="isSelectedUncompletedUserExercise" class="mb-4 font-weight-thin font-italic text-right">
          упражнение еще не пройдено
        </div>
        <div class="exercise-statistics-dialog__words mb-4">
          <v-divider />
          <IChipWord
            v-for="(word, index) in selectedWordsSummary.words"
            :key="`${index}:${word.english}`"
            :color="isSelectedUncompletedUserExercise
              ? 'secondary'
              : word.hasErrors ? 'red' : 'green'"
            language="en"
            :translation="word.russian"
            :word="word.english"
  />
          <v-chip
            v-if="selectedWordsSummary.hiddenCount > 0"
            color="grey"
            size="small"
          >
            еще +{{ selectedWordsSummary.hiddenCount }}
          </v-chip>
          <v-divider />
        </div>
        <div
          v-if="exerciseDialogText"
          class="exercise-statistics-dialog__question"
        >
          {{ exerciseDialogText }}
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          v-if="canStartSelectedGroup"
          color="primary"
          @click="isExerciseDialogOpen = false; startSelectedExercise()"
        >
          Да
        </v-btn>
        <v-btn
          color="secondary"
          @click="isExerciseDialogOpen = false"
        >
          {{ canStartSelectedGroup ? 'Нет' : 'Закрыть' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

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
  grid-auto-rows: minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.statistics-calendar :deep(.v-calendar-month__day) {
  min-height: 0;
  overflow: hidden;
}

.statistics-calendar :deep(.v-calendar-weekly__day-content) {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.statistics-calendar :deep(.v-calendar-weekly__day-content > div) {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.statistics-calendar :deep(.v-calendar-weekly__day-alldayevents-container) {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
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
  align-items: center;
  color: white;
  cursor: pointer;
  display: flex;
  flex-basis: 0;
  flex-shrink: 1;
  justify-content: center;
  margin: 2px 4px;
  min-height: 0;
  overflow: hidden;
  padding: 4px 6px;
}

.statistics-event--single-type {
  flex-basis: calc(50% - 4px);
  flex-grow: 0 !important;
  flex-shrink: 0;
}

.statistics-event__compact-title {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.statistics-event__compact-title span {
  margin-left: 3px;
}

.statistics-event__details {
  flex: 1 1 auto;
  justify-content: center;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

.statistics-event__title {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exercise-statistics-dialog__content {
  display: grid;
  gap: 8px;
  padding-top: 24px;
}

.exercise-statistics-dialog__words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.exercise-statistics-dialog__question {
  margin-top: 8px;
}
</style>
