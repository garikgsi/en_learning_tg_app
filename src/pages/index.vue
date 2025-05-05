<script lang="ts" setup>

import {computed, ref, onMounted} from 'vue';
import ITranslateTask from "@/components/ITranslateTask.vue";
import type {Task, Word} from "@/components/ITranslateTask.vue"


const list = ref<Word[]>([]);

const ruList = computed(() => {
  if (list.value.length) {
    return list.value.map(w => ({id: w.id, word: w.translate, translate: w.word}));
  }

  return [];
});

const taskCompleted = ((task: Task[]) => {
  console.log('taskCompleted', task)
});

const loadList = async () => {
  list.value = [
    {id: 1, word: 'птица', translate: 'bird'},
    {id: 2, word: 'кошка', translate: 'cat'},
    {id: 3, word: 'школа', translate: 'school'},
    {id: 4, word: 'дом', translate: 'home'},
    // {id: 5, word: 'сегодня', translate: 'today'},
    // {id: 6, word: 'завтра', translate: 'tomorrow'},
  ];
}

onMounted(async () => {
  await loadList();
})


</script>

<template>
  <v-responsive class="border rounded">
    <v-app>
      <v-app-bar title="Ежедневное задание"></v-app-bar>

      <v-navigation-drawer>
        <v-list>
          <v-list-item title="Navigation drawer"></v-list-item>
        </v-list>

      </v-navigation-drawer>

      <v-main>

        <v-container>

          <ITranslateTask v-if="list" :en-list="list" :ru-list="ruList" @finish="taskCompleted"></ITranslateTask>
          <template v-else>Идет загрузка задания...</template>

        </v-container>

      </v-main>
    </v-app>
  </v-responsive>
</template>


