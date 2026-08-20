<script setup lang="ts">
import {onMounted, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useRoute, useRouter} from 'vue-router';
import ITranslateTask from '@/components/ITranslateTask.vue';
import type {TranslationTask} from '@/types/translation';
import {useTranslateStore} from '@/stores/translateStore';
import {useNetwork} from '@/use/network';

type Props = {
  exerciseId?: string
}

const props = defineProps<Props>();
const translateStore = useTranslateStore();
const {wordList} = storeToRefs(translateStore);
const {isConnected} = useNetwork();
const router = useRouter();
const route = useRoute();

translateStore.clearWords();

const redirectToStatisticsIfCompleted = async (): Promise<void> => {
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

    await router.replace('/statistics');
  }
}

const loadExercise = async (): Promise<void> => {
  const exerciseId = props.exerciseId
    ? Number(props.exerciseId)
    : Number.NaN;

  let wasLoaded: boolean;

  if (Number.isInteger(exerciseId) && exerciseId > 0) {
    wasLoaded = await translateStore.loadExercise(exerciseId);
  } else {
    wasLoaded = await translateStore.loadWords();
  }

  if (wasLoaded) {
    await redirectToStatisticsIfCompleted();
  }
};

onMounted(async () => {
  await loadExercise();
});

watch(isConnected, async (connected, wasConnected) => {
  if (connected && wasConnected === false) {
    await loadExercise();
  }
});

const completeExercise = async (tasks: TranslationTask[]): Promise<void> => {
  await translateStore.taskCompleted(tasks);
  await redirectToStatisticsIfCompleted();
}
</script>

<template>

  <ITranslateTask
    v-if="wordList.length > 0"
    @finish="completeExercise"
  />

</template>
