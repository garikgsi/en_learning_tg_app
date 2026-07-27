<script setup lang="ts">
import {storeToRefs} from 'pinia';
import IAppLayout from '@/components/IAppLayout.vue';
import {useSettingsStore} from '@/stores/settingsStore';

const settingsStore = useSettingsStore();
const {dictionaryWordsPerPage} = storeToRefs(settingsStore);

const dictionaryPageSizeOptions = [10, 20, 30, 50, 100];
</script>

<template>
  <IAppLayout title="Настройки">
    <v-card class="mx-auto" max-width="640">
      <v-card-title>Настройки</v-card-title>

      <v-card-text>
        <v-select
          v-model="dictionaryWordsPerPage"
          :items="dictionaryPageSizeOptions"
          hint="Количество слов, загружаемых в таблицу словаря"
          label="Слов на странице"
          persistent-hint
          variant="outlined"
        ></v-select>
      </v-card-text>

      <v-card-actions>
        <v-btn prepend-icon="mdi-arrow-left" to="/" variant="text">
          Назад
        </v-btn>
      </v-card-actions>
    </v-card>
  </IAppLayout>
</template>
