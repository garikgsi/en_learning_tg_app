<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {getApiErrorMessage} from '@/api/errors';
import {httpDachshundGameDriver} from '@/api/http/dachshundGame';
import {httpGrammarRaceDriver} from '@/api/http/grammarRace';
import type {DachshundGameRecords} from '@/api/types/dachshundGame';
import type {
  GrammarRaceAchievement,
  GrammarRaceAchievementsResponse,
} from '@/api/types/grammarRace';
import {useNetwork} from '@/use/network';
import dachshundSitting from '@/assets/games/dachshund/dachshund-sitting.png';

const medalColors = [
  '#303136',
  '#684c43',
  '#9f673f',
  '#c29338',
  '#dfb92f',
] as const;

const {isConnected} = useNetwork();
const achievements = ref<GrammarRaceAchievementsResponse | null>(null);
const dachshundRecords = ref<DachshundGameRecords | null>(null);
const isLoading = ref(false);
const error = ref('');

const items = computed(() => achievements.value?.items ?? []);

const medalRating = (achievement: GrammarRaceAchievement): number => {
  if (achievement.maxLevel <= 1) return 5;

  const progress = (achievement.currentLevel - 1) / (achievement.maxLevel - 1) * 5;

  return Math.round(progress * 2) / 2;
};

const medalIndex = (level: number, maxLevel: number): number => {
  if (maxLevel <= 1) return medalColors.length - 1;

  return Math.min(
    medalColors.length - 1,
    Math.floor((level - 1) / (maxLevel - 1) * medalColors.length),
  );
};

const currentMedalColor = (achievement: GrammarRaceAchievement): string => (
  medalColors[Math.max(0, Math.min(medalColors.length - 1, achievement.medalTier - 1))]
);

const nextMedalColor = (achievement: GrammarRaceAchievement): string => (
  medalColors[medalIndex(
    Math.min(achievement.currentLevel + 1, achievement.maxLevel),
    achievement.maxLevel,
  )]
);

const ratingMedalColor = (incrementIndex: number, isFilled: boolean): string => {
  if (!isFilled) return '#b0b0b0';

  return medalColors[Math.floor(incrementIndex / 2)];
};

const winRate = (achievement: GrammarRaceAchievement): number => {
  if (achievement.gamesPlayed === 0) return 0;

  return Math.round(achievement.gamesWon / achievement.gamesPlayed * 100);
};

const pluralize = (count: number, forms: [string, string, string]): string => {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return forms[2];
  if (lastDigit === 1) return forms[0];
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1];

  return forms[2];
};

const levelProgressLabel = (achievement: GrammarRaceAchievement): string => {
  if (achievement.gamesAtLevel === 0) {
    const minimumGames = achievements.value?.levelUp.minimumGames ?? 5;
    const minimumWinRate = achievements.value?.levelUp.minimumWinRatePercent ?? 70;
    const minimumWins = Math.ceil(minimumGames * minimumWinRate / 100);

    return `Цель: ${minimumWins} ${pluralize(
      minimumWins,
      ['победа', 'победы', 'побед'],
    )} из ${minimumGames} ${pluralize(
      minimumGames,
      ['игры', 'игр', 'игр'],
    )}`;
  }

  return `${achievement.winsAtLevel} ${pluralize(
    achievement.winsAtLevel,
    ['победа', 'победы', 'побед'],
  )} из ${achievement.gamesAtLevel} ${pluralize(
    achievement.gamesAtLevel,
    ['игры', 'игр', 'игр'],
  )}`;
};

const load = async (): Promise<void> => {
  if (!isConnected.value) {
    error.value = 'Для загрузки достижений нужно подключение к интернету.';
    return;
  }

  isLoading.value = true;
  error.value = '';
  try {
    [achievements.value, dachshundRecords.value] = await Promise.all([
      httpGrammarRaceDriver.getAchievements(),
      httpDachshundGameDriver.getRecords(),
    ]);
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Не удалось загрузить достижения');
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="achievements-page">
    <v-alert v-if="error" class="mb-5" type="error" variant="tonal">
      {{ error }}
      <template #append>
        <v-btn
          :disabled="!isConnected"
          :loading="isLoading"
          size="small"
          variant="text"
          @click="load"
        >
          Повторить
        </v-btn>
      </template>
    </v-alert>

    <div v-if="isLoading && !achievements" class="achievements-grid">
      <v-skeleton-loader v-for="index in 3" :key="index" type="article, actions" />
    </div>

    <div v-else class="achievements-grid">
      <v-card
        class="achievement-card achievement-card--alpha"
        color="success"
        variant="tonal"
      >
        <v-card-text class="achievement-card__content pa-4 pa-sm-5">
          <v-img
            :src="dachshundSitting"
            aria-hidden="true"
            class="achievement-card__alpha-watermark"
            contain
          />

          <div class="achievement-card__top">
            <div class="achievement-card__heading">
              <div class="achievement-card__game-title text-overline">
                Такса Альфа
              </div>
              <h2 class="achievement-card__title font-weight-bold mt-1">
                Рекорды алфавитного путешествия
              </h2>
            </div>
          </div>

          <div class="achievement-card__stats achievement-card__stats--alpha mt-6">
            <div>
              <span class="text-caption text-medium-emphasis">Ваш высший счёт</span>
              <strong>{{ dachshundRecords?.personalBest ?? 0 }} очков</strong>
            </div>
            <div>
              <span class="text-caption text-medium-emphasis">Лучший среди всех</span>
              <strong>{{ dachshundRecords?.globalBest ?? 0 }} очков</strong>
            </div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-3 px-sm-5">
          <span class="text-body-2 text-medium-emphasis">Соберите весь алфавит</span>
          <v-spacer />
          <v-btn
            color="success"
            prepend-icon="mdi-paw"
            to="/games/dachshund"
            variant="flat"
          >
            Играть
          </v-btn>
        </v-card-actions>
      </v-card>

      <v-card
        v-for="achievement in items"
        :key="achievement.gameCode"
        class="achievement-card"
        variant="outlined"
      >
        <v-card-text class="achievement-card__content pa-4 pa-sm-5">
          <v-icon
            aria-hidden="true"
            class="achievement-card__watermark"
            :color="currentMedalColor(achievement)"
            icon="mdi-medal-outline"
            size="112"
          />

          <div class="achievement-card__top">
            <div class="achievement-card__heading">
              <div class="achievement-card__game-title text-overline">
                {{ achievement.gameTitle }}
              </div>
              <h2 class="achievement-card__title font-weight-bold mt-1">
                {{ achievement.rankTitle }} {{ achievement.currentLevel }} уровня
              </h2>

              <div class="achievement-card__rating mt-3">
                <v-rating
                  :aria-label="`Медальный прогресс в игре ${achievement.gameTitle}`"
                  density="compact"
                  empty-icon="mdi-medal"
                  full-icon="mdi-medal"
                  half-increments
                  :length="5"
                  :model-value="medalRating(achievement)"
                  readonly
                  size="32"
                >
                  <template #item="{props, isFilled, index}">
                    <v-btn
                      v-bind="props"
                      :color="ratingMedalColor(index, isFilled)"
                    />
                  </template>
                </v-rating>
              </div>
            </div>

          </div>

          <div class="achievement-card__stats mt-4">
            <div>
              <span class="text-caption text-medium-emphasis">Уровень</span>
              <strong>{{ achievement.currentLevel }} / {{ achievement.maxLevel }}</strong>
            </div>
            <div>
              <span class="text-caption text-medium-emphasis">Победы</span>
              <strong>{{ achievement.gamesWon }} из {{ achievement.gamesPlayed }}</strong>
            </div>
            <div>
              <span class="text-caption text-medium-emphasis">Процент побед</span>
              <strong>{{ winRate(achievement) }}%</strong>
            </div>
          </div>

          <template v-if="!achievement.isMaxLevel">
            <div class="d-flex justify-space-between ga-3 mt-4 mb-2 text-body-2">
              <span>До следующего уровня</span>
              <span class="text-medium-emphasis">
                {{ levelProgressLabel(achievement) }}
              </span>
            </div>
            <v-progress-linear
              :color="nextMedalColor(achievement)"
              height="8"
              :model-value="achievement.progressPercent"
              rounded
            />
          </template>
          <p
            v-else-if="achievement.isMaxLevel"
            class="achievement-card__maximum text-body-2 mt-4 mb-0"
          >
            Высшая награда
          </p>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-3 px-sm-5">
          <span v-if="!achievement.isAvailable" class="text-body-2 text-medium-emphasis">
            Доступно с {{ achievement.minGrade }} класса
          </span>
          <v-spacer />
          <v-btn
            color="primary"
            :disabled="!achievement.isAvailable"
            :prepend-icon="achievement.isAvailable ? 'mdi-flag-checkered' : 'mdi-lock-outline'"
            :to="achievement.isAvailable ? achievement.route : undefined"
            variant="tonal"
          >
            {{ achievement.isAvailable ? 'Играть' : 'Пока недоступно' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

  </section>
</template>

<style scoped>
.achievements-page {
  margin: 0 auto;
  max-width: 1000px;
}

.achievements-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.achievement-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.achievement-card--alpha {
  background:
    radial-gradient(circle at 86% 12%, rgba(255, 255, 255, 0.7), transparent 24%),
    linear-gradient(145deg, rgba(231, 249, 233, 0.94), rgba(199, 235, 211, 0.78));
}

.achievement-card .v-card-actions {
  margin-top: auto;
}

.achievement-card__content {
  position: relative;
}

.achievement-card__watermark {
  opacity: 0.16;
  position: absolute;
  right: 8px;
  top: 4px;
  z-index: 0;
}

.achievement-card__alpha-watermark {
  bottom: -28px;
  height: 172px;
  opacity: 0.2;
  pointer-events: none;
  position: absolute;
  right: -22px;
  width: 172px;
  z-index: 0;
}

.achievement-card__top {
  position: relative;
  z-index: 1;
}

.achievement-card__heading {
  min-width: 0;
}

.achievement-card__game-title {
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 700;
}

.achievement-card__title {
  font-size: clamp(0.7rem, 2.6vw, 1.25rem);
  line-height: 1.35;
  white-space: nowrap;
}

.achievement-card__rating {
  align-items: center;
  display: flex;
}

.achievement-card__stats {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  position: relative;
  z-index: 1;
}

.achievement-card__stats > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.achievement-card__stats strong {
  white-space: nowrap;
}

.achievement-card__stats--alpha {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 76%;
}

.achievement-card__maximum {
  color: #dfb92f;
  font-weight: 600;
  position: relative;
  text-align: center;
  z-index: 1;
}

@media (max-width: 800px) {
  .achievements-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 599px) {
  .achievement-card__watermark {
    right: 2px;
  }

  .achievement-card__stats--alpha {
    max-width: 100%;
  }

}
</style>
