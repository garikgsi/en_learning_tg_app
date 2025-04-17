<script lang="ts" setup>

import {computed} from 'vue';
import ITranslateTask from "@/components/ITranslateTask.vue";


const list = computed(() => {
  return [
    {id: 1, word: 'птица', translate: 'bird'},
    {id: 2, word: 'кошка', translate: 'cat'},
    {id: 3, word: 'школа', translate: 'school'},
    {id: 4, word: 'дом', translate: 'home'},
    {id: 5, word: 'сегодня', translate: 'today'},
    {id: 6, word: 'завтра', translate: 'tomorrow'},
  ];
});


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

          <ITranslateTask :en-list="list"></ITranslateTask>

        </v-container>

      </v-main>
    </v-app>
  </v-responsive>
</template>


