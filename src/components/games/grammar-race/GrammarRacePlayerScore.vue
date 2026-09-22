<script setup lang="ts">
type Props = {
  avatar: string
  label: string
  score: number
  targetScore: number
  side: 'student' | 'computer'
}

defineProps<Props>();
</script>

<template>
  <v-sheet
    class="pronoun-player-score pa-2 pa-sm-3"
    rounded="xl"
  >
    <div class="d-flex align-center ga-2">
      <v-avatar
        class="pronoun-player-score__avatar"
        :class="`pronoun-player-score__avatar--${side}`"
        size="42"
      >
        <v-img
          :alt="label"
          cover
          position="center 24%"
          :src="avatar"
        ></v-img>
      </v-avatar>

      <div class="min-width-0">
        <div class="text-caption text-medium-emphasis text-truncate">
          {{ label }}
        </div>
        <div class="pronoun-player-score__value text-h5 font-weight-bold text-high-emphasis">
          {{ score }}
        </div>
      </div>
    </div>

    <div
      :aria-label="`${score} из ${targetScore} очков`"
      class="pronoun-player-score__progress mt-2"
    >
      <span
        v-for="point in targetScore"
        :key="point"
        :class="{
          'pronoun-player-score__point--active': point <= score,
          [`pronoun-player-score__point--${side}`]: point <= score,
        }"
        class="pronoun-player-score__point"
      ></span>
    </div>
  </v-sheet>
</template>

<style scoped>
.pronoun-player-score {
  background: rgba(var(--v-theme-surface), 0.9);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: 0 8px 24px rgba(75, 33, 66, 0.08);
  flex: 1 1 0;
  min-width: 0;
}

.pronoun-player-score__avatar {
  background: rgba(var(--v-theme-primary), 0.12);
  border: 2px solid rgba(var(--v-theme-primary), 0.32);
}

.pronoun-player-score__avatar--computer {
  background: rgba(var(--v-theme-warning), 0.12);
  border-color: rgba(var(--v-theme-warning), 0.32);
}

.pronoun-player-score__progress {
  display: grid;
  gap: 5px;
  grid-template-columns: repeat(5, 1fr);
}

.pronoun-player-score__point {
  background: rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 999px;
  height: 6px;
}

.pronoun-player-score__point--student {
  background: rgb(var(--v-theme-primary));
}

.pronoun-player-score__point--computer {
  background: rgb(var(--v-theme-warning));
}
</style>
