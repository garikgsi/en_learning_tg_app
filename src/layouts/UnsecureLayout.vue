<script setup lang="ts">
type Props = {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'English Learning',
});

const currentYear = new Date().getFullYear();
</script>

<template>
  <v-app-bar border flat>
    <v-app-bar-title>
      <slot name="title">{{ title }}</slot>
    </v-app-bar-title>
  </v-app-bar>

  <v-main>
    <v-container class="py-6" fluid>
      <slot></slot>
    </v-container>
  </v-main>

  <v-footer
    app
    border
    class="justify-center text-medium-emphasis"
  >
    <small>© {{ currentYear }} English Learning</small>
  </v-footer>
</template>
