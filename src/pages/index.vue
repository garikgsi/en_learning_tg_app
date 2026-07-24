<script lang="ts" setup>

/*
* localhost:5432 database=tg_en login=tg passwd=Tconsult
* */

import {ref, onMounted} from 'vue';
import {storeToRefs} from 'pinia';
import ITranslateTask from "@/components/ITranslateTask.vue";
import type {Task} from "@/components/ITranslateTask.vue"
import {useTranslateStore} from "@/stores/translateStore";

type Props = {
  code?: string
}

const props = defineProps<Props>()

const translateStore = useTranslateStore();
const {enList, isLoading} = storeToRefs(translateStore);

const taskCompleted = ((task: Task[]) => {
  console.log('taskCompleted', task)
});

onMounted(async () => {
  await translateStore.loadWords(props.code);
})

const items = [
  {text: 'My Files', icon: 'mdi-folder'},
  {text: 'Shared with me', icon: 'mdi-account-multiple'},
  {text: 'Starred', icon: 'mdi-star'},
  {text: 'Recent', icon: 'mdi-history'},
  {text: 'Offline', icon: 'mdi-check-circle'},
  {text: 'Uploads', icon: 'mdi-upload'},
  {text: 'Backups', icon: 'mdi-cloud-upload'},
];

const accountDetails = ref(false);

const toggleDetails = () => {
  accountDetails.value = !accountDetails.value;
}


</script>

<template>
  <v-responsive class="border rounded">
    <v-app>
      <!--
    <v-app-bar class="d-sm-block d-none">

    <template #prepend>
        <v-app-bar-nav-icon @click="console.log('test')"></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title class="d-sm-block d-none">
        Перевод слов
      </v-app-bar-title>


      </v-app-bar>
      -->

      <v-navigation-drawer>
        <v-card
          class="mx-auto"
          width="256"
        >
          <v-layout>
            <v-navigation-drawer>
              <v-list>
                <v-list-item
                  prepend-avatar="https://cdn.vuetifyjs.com/images/john.png"
                  subtitle="test@example.org"
                  title="Your Nickname"
                >
                  <template v-slot:append>
                    <v-btn
                      :icon="accountDetails ? 'mdi-menu-up' : 'mdi-menu-down'"
                      size="small"
                      variant="text"
                      @click="toggleDetails"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>

              <v-divider></v-divider>

              <v-list
                v-if="accountDetails"
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

          <ITranslateTask v-if="!isLoading && enList.length > 0"
                          @finish="taskCompleted"></ITranslateTask>
          <template v-else>Идет загрузка задания...</template>

        </v-container>

      </v-main>
    </v-app>
  </v-responsive>
</template>


