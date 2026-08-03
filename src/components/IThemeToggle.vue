<script setup lang="ts">
import {computed} from 'vue';
import {storeToRefs} from 'pinia';
import {useSettingsStore} from '@/stores/settingsStore';

const settingsStore = useSettingsStore();
const {isDarkTheme} = storeToRefs(settingsStore);

const icon = computed(() => isDarkTheme.value ? 'mdi-white-balance-sunny' : 'mdi-weather-night');
const label = computed(() => isDarkTheme.value ? 'Включить светлую тему' : 'Включить тёмную тему');
</script>

<template>
  <v-btn
    :aria-label="label"
    icon
    variant="text"
    @click="isDarkTheme = !isDarkTheme"
  >
    <v-icon :icon="icon"></v-icon>

    <v-tooltip activator="parent" location="bottom">
      {{ label }}
    </v-tooltip>
  </v-btn>
</template>
