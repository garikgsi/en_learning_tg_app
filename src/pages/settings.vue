<script setup lang="ts">
import IAppLayout from '@/components/IAppLayout.vue';
</script>

<template>
  <IAppLayout title="Настройки">
    <v-card class="mx-auto" max-width="640">
      <v-card-title>Настройки</v-card-title>

      <v-card-text>
        Настройки учётной записи появятся здесь позже.
      </v-card-text>

      <v-card-actions>
        <v-btn prepend-icon="mdi-arrow-left" to="/" variant="text">
          Назад
        </v-btn>
      </v-card-actions>
    </v-card>
  </IAppLayout>
</template>
