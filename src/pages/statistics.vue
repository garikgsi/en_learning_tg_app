<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {
  type ExerciseStatisticsItem,
  useStatisticsStore,
} from '@/stores/statisticsStore';

type StatisticsCalendarEvent = ExerciseStatisticsItem & {
  id: string
  title: string
  start: Date
  end: Date
  allDay: true
  color: string
}

const statisticsStore = useStatisticsStore();
const {items, isLoading, errorMessage} = storeToRefs(statisticsStore);

const calendarDate = ref<Date[]>([new Date()]);

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

const events = computed<StatisticsCalendarEvent[]>(() => {
  return items.value.map(item => {
    const date = new Date(item.date);

    return {
      ...item,
      id: item.completionId === null
        ? `exercise-${item.exerciseId}`
        : `completion-${item.completionId}`,
      title: item.type.title,
      start: date,
      end: date,
      allDay: true,
      color: item.status === 'uncompleted'
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

onMounted(async () => {
  await statisticsStore.loadMonth(visibleMonth.value);
});
</script>

<template>
  <v-alert
    v-if="errorMessage"
    class="mb-4"
    closable
    text="Повторите попытку или перейдите к другому месяцу."
    title="Не удалось загрузить статистику"
    type="error"
    @click:close="statisticsStore.clearError"
  ></v-alert>

  <v-card>
    <v-card-text class="pb-2">
      <div class="statistics-legend">
        <div class="statistics-legend__item">
          <span class="statistics-legend__color bg-red-darken-1"></span>
          Не пройдено
        </div>
        <div class="statistics-legend__item">
          <span class="statistics-legend__gradient"></span>
          Пройдено — оттенок зависит от доли слов без ошибок
        </div>
      </div>
    </v-card-text>

    <v-progress-linear
      v-if="isLoading"
      indeterminate
    ></v-progress-linear>

    <div class="statistics-calendar-scroll">
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
                :color="event.color as string"
                rounded="sm"
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
          </v-tooltip>
        </template>
      </v-calendar>
    </div>
  </v-card>
</template>

<style scoped>
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

.statistics-calendar-scroll {
  overflow-x: auto;
}

.statistics-calendar {
  min-width: 760px;
}

.statistics-event {
  color: white;
  cursor: default;
  margin: 2px 4px;
  overflow: hidden;
  padding: 4px 6px;
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
