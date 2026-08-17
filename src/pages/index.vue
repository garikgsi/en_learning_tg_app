<script lang="ts" setup>

/*
* localhost:5432 database=tg_en login=tg passwd=Tconsult
* */

import {onMounted} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import ITranslateTask from "@/components/ITranslateTask.vue";
import type {TranslationTask} from '@/types/translation';
import {useTranslateStore} from "@/stores/translateStore";

type Props = {
  code?: string
}

const props = defineProps<Props>()

const translateStore = useTranslateStore();
const {wordList} = storeToRefs(translateStore);
const router = useRouter();

const redirectToStatisticsIfCompleted = async (): Promise<void> => {
  if (wordList.value.length === 0) {
    await router.replace('/statistics');
  }
}

onMounted(async () => {
  await translateStore.loadWords(props.code);
  await redirectToStatisticsIfCompleted();
})

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
