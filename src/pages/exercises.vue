<script setup lang="ts">
import {onMounted} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import ITranslateTask from '@/components/ITranslateTask.vue';
import type {Task} from '@/components/ITranslateTask.vue';
import {useTranslateStore} from '@/stores/translateStore';

type Props = {
  exerciseId?: string
}

const props = defineProps<Props>();
const translateStore = useTranslateStore();
const {enList} = storeToRefs(translateStore);
const router = useRouter();

translateStore.clearWords();

const redirectToStatisticsIfCompleted = async (): Promise<void> => {
  if (enList.value.length === 0) {
    await router.replace('/statistics');
  }
}

onMounted(async () => {
  const exerciseId = props.exerciseId
    ? Number(props.exerciseId)
    : Number.NaN;

  if (Number.isInteger(exerciseId) && exerciseId > 0) {
    await translateStore.loadExercise(exerciseId);
  } else {
    await translateStore.loadWords();
  }

  await redirectToStatisticsIfCompleted();
});

const completeExercise = async (tasks: Task[]): Promise<void> => {
  await translateStore.taskCompleted(tasks);
  await redirectToStatisticsIfCompleted();
}
</script>

<template>

  <ITranslateTask
    v-if="enList.length > 0"
    @finish="completeExercise"
  />

</template>
