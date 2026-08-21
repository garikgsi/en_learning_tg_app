<template>
  <v-card class="statistics-page-skeleton">
    <v-card-title class="statistics-page-skeleton__header">
      <v-spacer />
      <v-skeleton-loader type="button" width="150" />
    </v-card-title>

    <v-divider />

    <v-skeleton-loader
      class="statistics-page-skeleton__calendar"
      type="table"
    />
  </v-card>
</template>

<style scoped>
  .statistics-page-skeleton {
    display: flex;
    flex-direction: column;
    height: 720px;
  }

  .statistics-page-skeleton__header {
    align-items: center;
    display: flex;
    min-height: 64px;
  }

  .statistics-page-skeleton__calendar {
    flex: 1 1 auto;
  }
</style>
