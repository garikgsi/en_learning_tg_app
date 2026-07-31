<script lang="ts" setup>

/*
* localhost:5432 database=tg_en login=tg passwd=Tconsult
* */

import {onMounted} from 'vue';
import {storeToRefs} from 'pinia';
import {useRouter} from 'vue-router';
import ITranslateTask from "@/components/ITranslateTask.vue";
import type {Task} from '@/components/ITranslateTask.vue';
import {useTranslateStore} from "@/stores/translateStore";

type Props = {
  code?: string
}

const props = defineProps<Props>()

const translateStore = useTranslateStore();
const {enList, isLoading, errorMessage} = storeToRefs(translateStore);
const router = useRouter();

const redirectToStatisticsIfCompleted = async (): Promise<void> => {
  if (!errorMessage.value && enList.value.length === 0) {
    await router.replace('/statistics');
  }
}

onMounted(async () => {
  await translateStore.loadWords(props.code);
  await redirectToStatisticsIfCompleted();
})

const completeExercise = async (tasks: Task[]): Promise<void> => {
  await translateStore.taskCompleted(tasks);
  await redirectToStatisticsIfCompleted();
}

</script>

<template>
  <v-progress-linear
    v-if="isLoading"
    indeterminate
  />

  <v-alert
    v-else-if="errorMessage"
    :text="errorMessage"
    title="Не удалось загрузить задание"
    type="error"
  />

  <ITranslateTask
    v-else-if="enList.length > 0"
    @finish="completeExercise"
  />
</template>


