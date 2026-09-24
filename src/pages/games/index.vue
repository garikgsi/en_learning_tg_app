<script setup lang="ts">
import {computed} from 'vue';
import {storeToRefs} from 'pinia';
import robotThinking from '@/components/games/grammar-race/assets/robot-thinking.png';
import studentHappy from '@/components/games/grammar-race/assets/student-happy.png';
import studentThinking from '@/components/games/grammar-race/assets/student-thinking.png';
import {useUserStore} from '@/stores/userStore';
import {pronounRace} from '@/components/games/pronoun/pronounRace';
import {possessivePronounRace} from '@/components/games/possessive-pronoun/possessivePronounRace';
import {articleRace} from '@/components/games/article/articleRace';
import {toBeRace} from '@/components/games/to-be/toBeRace';

const minimumPronounGrade = pronounRace.minGrade;
const minimumPossessivePronounGrade = possessivePronounRace.minGrade;
const minimumArticleGrade = articleRace.minGrade;
const minimumToBeGrade = toBeRace.minGrade;
const {user} = storeToRefs(useUserStore());
const isPronounGameAvailable = computed(() => (
  (user.value?.grade ?? 0) >= minimumPronounGrade
));
const isPossessivePronounGameAvailable = computed(() => (
  (user.value?.grade ?? 0) >= minimumPossessivePronounGrade
));
const isArticleGameAvailable = computed(() => (
  (user.value?.grade ?? 0) >= minimumArticleGrade
));
const isToBeGameAvailable = computed(() => (
  (user.value?.grade ?? 0) >= minimumToBeGrade
));
</script>

<template>
  <section class="games-page">
    <div class="games-page__heading">
      <div class="games-page__heading-top">
        <div>
          <div class="text-overline text-primary">Грамматические гонки</div>
          <h1 class="text-h4 font-weight-bold">Учимся в игре</h1>
        </div>

        <div class="games-page__characters" aria-hidden="true">
          <v-img :src="studentHappy" width="98"></v-img>
          <v-img :src="robotThinking" width="98"></v-img>
        </div>
      </div>

      <p class="games-page__description text-body-1 text-medium-emphasis mt-2 mb-0">
        Отвечайте быстрее компьютера, повышайте сложность и получайте коины за победы.
      </p>
    </div>

    <div class="games-grid mt-6">
      <v-card
        class="game-card game-card--active"
        color="primary"
        :to="isPronounGameAvailable ? '/games/pronoun' : undefined"
        variant="tonal"
      >
        <v-card-item>
          <template #prepend>
            <div
              aria-hidden="true"
              class="game-card__visual game-card__visual--pronouns"
            >
              <v-img
                class="game-card__character game-card__character--girl-face game-card__character--mirrored"
                cover
                position="center 21%"
                :src="studentHappy"
              ></v-img>
              <span class="game-card__token game-card__token--left">I</span>
              <span class="game-card__token game-card__token--right">It</span>
            </div>
          </template>
          <v-card-title>Личные местоимения</v-card-title>
          <v-card-subtitle>
            {{ isPronounGameAvailable ? 'Доступно сейчас' : `Доступно со ${minimumPronounGrade} класса` }}
          </v-card-subtitle>
        </v-card-item>

        <v-card-text>
          Кто из вас быстрее определит 5 местоимений - получит награду - 2 монеты
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn
            :append-icon="isPronounGameAvailable ? 'mdi-arrow-right' : undefined"
            color="primary"
            :disabled="!isPronounGameAvailable"
            :prepend-icon="isPronounGameAvailable ? undefined : 'mdi-lock-outline'"
            variant="flat"
          >
            {{ isPronounGameAvailable ? 'Играть' : `С ${minimumPronounGrade} класса` }}
          </v-btn>
        </v-card-actions>
      </v-card>

      <v-card
        class="game-card game-card--active"
        color="primary"
        :to="isArticleGameAvailable ? '/games/articles' : undefined"
        variant="tonal"
      >
        <v-card-item>
          <template #prepend>
            <div
              aria-hidden="true"
              class="game-card__visual game-card__visual--articles"
            >
              <v-img
                class="game-card__character game-card__character--robot-book"
                contain
                :src="robotThinking"
              ></v-img>
              <div class="game-card__book">a · an · the</div>
            </div>
          </template>
          <v-card-title>Гонка артиклей</v-card-title>
          <v-card-subtitle>
            {{ isArticleGameAvailable ? 'Доступно сейчас' : `Доступно с ${minimumArticleGrade} класса` }}
          </v-card-subtitle>
        </v-card-item>

        <v-card-text>
          Выбирайте a, an, the или вариант без артикля и получайте понятный разбор ошибок
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn
            :append-icon="isArticleGameAvailable ? 'mdi-arrow-right' : undefined"
            color="primary"
            :disabled="!isArticleGameAvailable"
            :prepend-icon="isArticleGameAvailable ? undefined : 'mdi-lock-outline'"
            variant="flat"
          >
            {{ isArticleGameAvailable ? 'Играть' : `С ${minimumArticleGrade} класса` }}
          </v-btn>
        </v-card-actions>
      </v-card>

      <v-card
        class="game-card game-card--active"
        color="primary"
        :to="isPossessivePronounGameAvailable ? '/games/possessive-pronoun' : undefined"
        variant="tonal"
      >
        <v-card-item>
          <template #prepend>
            <div
              aria-hidden="true"
              class="game-card__visual game-card__visual--possessive"
            >
              <v-img
                class="game-card__character game-card__character--girl-thinking"
                contain
                position="center 21%"
                :src="studentThinking"
              ></v-img>
              <span class="game-card__token game-card__token--left">my</span>
              <span class="game-card__token game-card__token--right">their</span>
            </div>
          </template>
          <v-card-title>Притяжательные местоимения</v-card-title>
          <v-card-subtitle>
            {{ isPossessivePronounGameAvailable ? 'Доступно сейчас' : `Доступно с ${minimumPossessivePronounGrade} класса` }}
          </v-card-subtitle>
        </v-card-item>

        <v-card-text>
          Выбирайте my, your, his, her, its, our или their быстрее компьютера и получите 2 монеты за победу
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn
            :append-icon="isPossessivePronounGameAvailable ? 'mdi-arrow-right' : undefined"
            color="primary"
            :disabled="!isPossessivePronounGameAvailable"
            :prepend-icon="isPossessivePronounGameAvailable ? undefined : 'mdi-lock-outline'"
            variant="flat"
          >
            {{ isPossessivePronounGameAvailable ? 'Играть' : `С ${minimumPossessivePronounGrade} класса` }}
          </v-btn>
        </v-card-actions>
      </v-card>

      <v-card
        class="game-card game-card--active"
        color="primary"
        :to="isToBeGameAvailable ? '/games/to-be' : undefined"
        variant="tonal"
      >
        <v-card-item>
          <template #prepend>
            <div
              aria-hidden="true"
              class="game-card__visual game-card__visual--verbs"
            >
              <v-img
                class="game-card__character game-card__character--robot-face game-card__character--mirrored"
                cover
                position="center 21%"
                :src="robotThinking"
              ></v-img>
              <span class="game-card__token game-card__token--left">am</span>
              <span class="game-card__token game-card__token--right">were</span>
            </div>
          </template>
          <v-card-title>Форма глагола to be</v-card-title>
          <v-card-subtitle>
            {{ isToBeGameAvailable ? 'Доступно сейчас' : `Доступно со ${minimumToBeGrade} класса` }}
          </v-card-subtitle>
        </v-card-item>

        <v-card-text>
          Выбирайте am, is, are, а на сложных уровнях — was или were
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn
            :append-icon="isToBeGameAvailable ? 'mdi-arrow-right' : undefined"
            color="primary"
            :disabled="!isToBeGameAvailable"
            :prepend-icon="isToBeGameAvailable ? undefined : 'mdi-lock-outline'"
            variant="flat"
          >
            {{ isToBeGameAvailable ? 'Играть' : `Со ${minimumToBeGrade} класса` }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </section>
</template>

<style scoped>
.games-page {
  margin: 0 auto;
  max-width: 1000px;
}

.games-page__heading {
  width: 100%;
}

.games-page__heading-top {
  align-items: center;
  display: flex;
  gap: 24px;
  justify-content: space-between;
}

.games-page__description {
  width: 100%;
}

.games-page__characters {
  align-items: flex-end;
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  height: 112px;
  overflow: hidden;
}

.games-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.game-card {
  display: flex;
  flex-direction: column;
  min-height: 190px;
}

.game-card--active {
  grid-column: 1 / -1;
}

.game-card__visual {
  background: linear-gradient(145deg, #fff0f7, #e9dcff);
  border: 3px solid rgb(var(--v-theme-surface));
  border-radius: 50%;
  box-shadow: 0 5px 14px rgba(79, 52, 101, 0.2);
  flex: 0 0 76px;
  height: 76px;
  overflow: hidden;
  position: relative;
  width: 76px;
}

.game-card__visual--pronouns {
  background: linear-gradient(145deg, #ffe8a8, #f3c7ff);
}

.game-card__visual--possessive {
  background: linear-gradient(145deg, #e4d4ff, #ffcde5);
}

.game-card__visual--articles {
  background: linear-gradient(145deg, #c8f3ff, #d8dcff);
}

.game-card__visual--verbs {
  background: linear-gradient(145deg, #d4f8d9, #fff0ad);
}

.game-card__character {
  position: absolute;
}

.game-card__character--girl-face,
.game-card__character--girl-thinking,
.game-card__character--robot-face {
  height: 84px;
  left: -4px;
  top: -4px;
  width: 84px;
}

.game-card__character--girl-face {
  left: -7px;
  top: 5px;
  width: 90px;
}

.game-card__character--girl-thinking {
  height: 72px;
  left: 4px;
  top: 1px;
  width: 68px;
}

.game-card__character--robot-face {
  height: 88px;
  left: -6px;
  top: -8px;
  width: 88px;
}

.game-card__character--girl-face :deep(.v-img__img) {
  transform: scale(1.24);
  transform-origin: 52% 8%;
}

.game-card__character--robot-face :deep(.v-img__img) {
  transform: scale(1.48);
  transform-origin: 50% 22%;
}

.game-card__character--mirrored {
  transform: scaleX(-1);
}

.game-card__character--robot-book {
  bottom: -5px;
  height: 72px;
  left: 9px;
  width: 58px;
}

.game-card__token {
  align-items: center;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-theme-secondary), 0.45);
  border-radius: 10px;
  box-shadow: 0 3px 8px rgba(57, 35, 74, 0.16);
  color: rgb(var(--v-theme-primary));
  display: flex;
  font-size: 11px;
  font-weight: 900;
  height: 25px;
  justify-content: center;
  min-width: 25px;
  padding: 0 4px;
  position: absolute;
  bottom: 3px;
  z-index: 2;
}

.game-card__token--left {
  left: 2px;
  transform: rotate(-8deg);
}

.game-card__token--right {
  right: 2px;
  transform: rotate(8deg);
}

.game-card__book {
  align-items: center;
  background: #fffdf5;
  border: 2px solid #8e689e;
  border-radius: 4px 4px 9px 9px;
  bottom: 2px;
  color: #6b3982;
  display: flex;
  font-size: 9px;
  font-weight: 900;
  height: 24px;
  justify-content: center;
  left: 7px;
  letter-spacing: -0.02em;
  position: absolute;
  transform: perspective(45px) rotateX(10deg);
  width: 62px;
  z-index: 3;
}

.game-card__book::after {
  background: rgba(142, 104, 158, 0.35);
  content: '';
  height: 100%;
  left: 50%;
  position: absolute;
  top: 0;
  width: 1px;
}

.game-card :deep(.v-card-actions) {
  margin-top: auto;
}

.game-card__soon {
  justify-content: center;
  padding: 0 16px 16px;
}

.game-card__soon :deep(.v-chip) {
  font-weight: 700;
  justify-content: center;
  width: 100%;
}

@media (max-width: 600px) {
  .games-page__heading-top {
    align-items: flex-start;
  }

  .games-page__characters {
    height: 86px;
  }

  .games-page__characters :deep(.v-img) {
    width: 72px !important;
  }

  .games-grid {
    grid-template-columns: 1fr;
  }

  .game-card--active {
    grid-column: auto;
  }

  .game-card--active :deep(.v-card-actions) {
    align-items: stretch;
    flex-direction: column;
  }

  .game-card--active :deep(.v-card-actions .v-spacer) {
    display: none;
  }
}
</style>
