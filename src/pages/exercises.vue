<script setup lang="ts">
import {onMounted} from 'vue';
import {storeToRefs} from 'pinia';
import ITranslateTask from '@/components/ITranslateTask.vue';
import {useTranslateStore} from '@/stores/translateStore';

const translateStore = useTranslateStore();
const {enList, isLoading} = storeToRefs(translateStore);

onMounted(async () => {
  await translateStore.loadWords();
});
</script>

<template>
  <ITranslateTask
    v-if="!isLoading && enList.length > 0"
    @finish="translateStore.taskCompleted"
  ></ITranslateTask>

  <template v-else>
    Идет загрузка задания...
  </template>
</template>
