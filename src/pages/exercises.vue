<script setup lang="ts">
import {onMounted} from 'vue';
import {storeToRefs} from 'pinia';
import ITranslateTask from '@/components/ITranslateTask.vue';
import {useTranslateStore} from '@/stores/translateStore';

const translateStore = useTranslateStore();
const {enList, isLoading, errorMessage} = storeToRefs(translateStore);

onMounted(async () => {
  await translateStore.loadWords();
});
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
    @finish="translateStore.taskCompleted"
  />

  <v-alert
    v-else
    text="На текущий момент активных заданий нет"
    title="Нет заданий"
    type="info"
  />
</template>
