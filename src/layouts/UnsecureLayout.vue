<script setup lang="ts">
import IThemeToggle from '@/components/IThemeToggle.vue';
import useLoading from '@/use/loading';
import IMessage from "@/components/IMessage.vue";

const {isLoading} = useLoading();

type Props = {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'English Learning',
});

const currentYear = new Date().getFullYear();

</script>

<template>

  <IMessage/>

  <v-app-bar border flat>
    <v-app-bar-title>
      <slot name="title">{{ title }}</slot>
    </v-app-bar-title>

    <template #append>
      <IThemeToggle></IThemeToggle>
    </template>

    <v-progress-linear
      :active="isLoading"
      :indeterminate="isLoading"
      color="primary"
      location="bottom"
      absolute
    ></v-progress-linear>

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
