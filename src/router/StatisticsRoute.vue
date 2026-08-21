<script setup lang="ts">
  import { defineAsyncComponent } from 'vue';
  import IStatisticsPageSkeleton from '@/components/IStatisticsPageSkeleton.vue';

  const StatisticsPage = defineAsyncComponent({
    loader: () => import('@/pages/statistics.vue'),
    loadingComponent: IStatisticsPageSkeleton,
    delay: 0,
  });
</script>

<template>
  <StatisticsPage />
</template>
