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

const items = [
  { text: 'My Files', icon: 'mdi-folder' },
  { text: 'Shared with me', icon: 'mdi-account-multiple' },
  { text: 'Starred', icon: 'mdi-star' },
  { text: 'Recent', icon: 'mdi-history' },
  { text: 'Offline', icon: 'mdi-check-circle' },
  { text: 'Uploads', icon: 'mdi-upload' },
  { text: 'Backups', icon: 'mdi-cloud-upload' },
]

</script>

<template>
  <v-responsive class="border rounded">
    <v-app>
      <v-app-bar title="Ежедневное задание"></v-app-bar>

      <v-navigation-drawer>
        <v-card
          class="mx-auto"
          width="256"
        >
          <v-layout>
            <v-navigation-drawer absolute permanent>
              <v-list>
                <v-list-item
                  prepend-avatar="https://cdn.vuetifyjs.com/images/john.png"
                  subtitle="john@google.com"
                  title="John Leider"
                >
                  <template v-slot:append>
                    <v-btn
                      icon="mdi-menu-down"
                      size="small"
                      variant="text"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>

              <v-divider></v-divider>

              <v-list
                :lines="false"
                density="compact"
                nav
              >
                <v-list-item
                  v-for="(item, i) in items"
                  :key="i"
                  :value="item"
                  color="primary"
                >
                  <template v-slot:prepend>
                    <v-icon :icon="item.icon"></v-icon>
                  </template>

                  <v-list-item-title v-text="item.text"></v-list-item-title>
                </v-list-item>
              </v-list>
            </v-navigation-drawer>

            <v-main style="height: 354px;"></v-main>
          </v-layout>
        </v-card>


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


