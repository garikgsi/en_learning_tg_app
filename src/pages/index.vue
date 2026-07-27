<script lang="ts" setup>

/*
* localhost:5432 database=tg_en login=tg passwd=Tconsult
* */

import {onMounted} from 'vue';
import {storeToRefs} from 'pinia';
import IAppLayout from "@/components/IAppLayout.vue";
import ITranslateTask from "@/components/ITranslateTask.vue";
import {useTranslateStore} from "@/stores/translateStore";

type Props = {
  code?: string
}

const props = defineProps<Props>()

const translateStore = useTranslateStore();
const {enList, isLoading} = storeToRefs(translateStore);

onMounted(async () => {
  await translateStore.loadWords(props.code);
})

</script>

<template>
  <IAppLayout>
    <ITranslateTask v-if="!isLoading && enList.length > 0"
                    @finish="translateStore.taskCompleted"></ITranslateTask>
    <template v-else>Идет загрузка задания...</template>
  </IAppLayout>
</template>


