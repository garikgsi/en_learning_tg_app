<script setup lang="ts">
  import { computed } from 'vue';
  import { useTheme } from 'vuetify';
  import { use } from 'echarts/core';
  import { CanvasRenderer } from 'echarts/renderers';
  import { BarChart } from 'echarts/charts';
  import {
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent,
  } from 'echarts/components';
  import type { EChartsOption } from 'echarts';
  import VChart from 'vue-echarts';
  import type {
    ExerciseStatisticsChartPeriod,
    ExerciseStatisticsCharts,
  } from '@/api/types/statistics';

  type Props = {
    charts: ExerciseStatisticsCharts | null
    isLoading: boolean
  }

  const props = defineProps<Props>();
  const theme = useTheme();

  use([
    CanvasRenderer,
    BarChart,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent,
  ]);

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
        confine: true,
        extraCssText: [
          'box-sizing: border-box',
          'max-width: min(320px, calc(100vw - 32px))',
          'overflow-wrap: anywhere',
          'white-space: normal',
        ].join(';'),
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
    return buildChartOption(props.charts?.week);
  });

  const monthChartOption = computed<EChartsOption>(() => {
    return buildChartOption(props.charts?.month);
  });

  const hasCompletedExercises = (
    period?: ExerciseStatisticsChartPeriod,
  ): boolean => {
    return period?.users.some(user => user.completedExercises > 0) ?? false;
  }

  const hasWeekExercises = computed(() => {
    return hasCompletedExercises(props.charts?.week);
  });

  const hasMonthExercises = computed(() => {
    return hasCompletedExercises(props.charts?.month);
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
</script>

<template>
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
</template>

<style scoped>
  .statistics-charts {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
    margin-top: 16px;
  }

  .statistics-chart {
    height: 380px;
    width: 100%;
  }

  @media (min-width: 1280px) {
    .statistics-charts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
