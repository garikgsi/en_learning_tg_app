<script lang="ts" setup>

import {computed, ref} from 'vue';
import IWord from "@/components/IWord.vue";
import type {WordResult} from "@/components/types/WordResult.ts";

const onFinish = (result: WordResult) => {

  if (result.isOk) {

    const word = words.value.find(w => w.translate === result.answer);

    if (word) {
      results.value.push({
        ...word, isOk: true
      });
    }

  }

  console.log('result', result)
}

const results = ref([]);

const words = computed(() => {
  return [
    {id: 1, word: 'птица', translate: 'bird'},
    {id: 2, word: 'кошка', translate: 'cat'},
    {id: 3, word: 'школа', translate: 'school'},
    {id: 4, word: 'дом', translate: 'home'},
    {id: 5, word: 'сегодня', translate: 'today'},
    {id: 5, word: 'сегодня', translate: 'today'},
  ]
});


</script>

<template>
  <v-responsive class="border rounded" max-height="300">
    <v-app>
      <v-app-bar title="Ежедневное задание"></v-app-bar>

      <v-navigation-drawer>
        <v-list>
          <v-list-item title="Navigation drawer"></v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-main>
        <v-container>
          <h1>Слово 1 из 5</h1>

          <IWord word="птица" translate="bird" @finish="onFinish"></IWord>
        </v-container>
      </v-main>
    </v-app>
  </v-responsive>
</template>


