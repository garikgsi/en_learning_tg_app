<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue';
import {Haptics} from '@capacitor/haptics';
import {storeToRefs} from 'pinia';
import {onBeforeRouteLeave, useRouter} from 'vue-router';
import IConfirmDialog from '@/components/IConfirmDialog.vue';
import type {
  GrammarRaceGameCode,
  GrammarRacePlayMode,
  GrammarRaceRound,
  GrammarRaceSession,
  GrammarRaceStatus,
} from '@/api/types/grammarRace';
import {getApiErrorMessage} from '@/api/errors';
import {useUserStore} from '@/stores/userStore';
import {useGrammarRaceRepository} from '@/use/grammarRaceRepository';
import {useNetwork} from '@/use/network';
import useMessages from '@/use/messages';
import GrammarRaceLobbyScreen from './GrammarRaceLobbyScreen.vue';
import GrammarRaceRoundScreen from './GrammarRaceRoundScreen.vue';
import GrammarRaceResultScreen from './GrammarRaceResultScreen.vue';
import {
  grammarRaceBotDisplayAnswer,
  grammarRaceRetryBotDelayMs,
  grammarRaceSecondAttemptWindow,
  needsGrammarRaceReview,
  resolveGrammarRaceRound,
  type GrammarRaceRoundOutcome,
} from './engine';
import type {GrammarRaceDefinition, GrammarRaceTask} from './types';

type Props = {
  game: GrammarRaceDefinition
  gameCode: GrammarRaceGameCode
}

type GameScreen = 'lobby' | 'round' | 'result'

const props = defineProps<Props>();
const router = useRouter();
const userStore = useUserStore();
const {user} = storeToRefs(userStore);
const {isConnected} = useNetwork();
const repository = useGrammarRaceRepository();
const {addError} = useMessages();

const screen = ref<GameScreen>('lobby');
const status = ref<GrammarRaceStatus | null>(null);
const session = ref<GrammarRaceSession | null>(null);
const isLoading = ref(false);
const studentScore = ref(0);
const computerScore = ref(0);
const roundIndex = ref(0);
const rounds = ref<GrammarRaceRound[]>([]);
const selectedAnswer = ref<string | null>(null);
const firstSelectedAnswer = ref<string | null>(null);
const firstSelectedAnswerMs = ref<number | null>(null);
const secondSelectedAnswer = ref<string | null>(null);
const secondSelectedAnswerMs = ref<number | null>(null);
const secondAttemptAvailable = ref(false);
const displayedBotAnswer = ref<string | null>(null);
const roundResolved = ref(false);
const reviewVisible = ref(false);
const botHasAnswered = ref(false);
const botState = ref<'thinking' | 'correct' | 'incorrect'>('thinking');
const studentState = ref<'ready' | 'correct' | 'incorrect'>('ready');
const timerProgress = ref(0);
const roundMessage = ref('Ответьте раньше соперника');
const result = ref<'win' | 'loss'>('loss');
const isResultPending = ref(false);
const exitDialog = ref(false);
const pendingDestination = ref('/games');
const allowNavigation = ref(false);
const currentPlayMode = ref<GrammarRacePlayMode>('competitive');

let roundStartedAt = 0;
let botTimer: number | null = null;
let graceTimer: number | null = null;
let nextRoundTimer: number | null = null;
let progressTimer: number | null = null;
let secondAttemptStartedAt = 0;
let secondAttemptDurationMs = 0;
let secondAttemptEndsAtMs = 0;
const mistakeVibrationDurationMs = 300;

const vibrateOnMistake = (): void => {
  void Haptics.vibrate({
    duration: mistakeVibrationDurationMs,
  }).catch(() => {
    navigator.vibrate?.(mistakeVibrationDurationMs);
  });
};

const clearRoundTimers = (): void => {
  if (botTimer !== null) window.clearTimeout(botTimer);
  if (graceTimer !== null) window.clearTimeout(graceTimer);
  if (nextRoundTimer !== null) window.clearTimeout(nextRoundTimer);
  if (progressTimer !== null) window.clearInterval(progressTimer);
  botTimer = null;
  graceTimer = null;
  nextRoundTimer = null;
  progressTimer = null;
};

const apiTask = computed(() => {
  if (!session.value?.tasks.length) return null;

  return session.value.tasks[roundIndex.value % session.value.tasks.length];
});

const task = computed<GrammarRaceTask | null>(() => {
  if (!apiTask.value || !session.value) return null;

  return {
    id: String(apiTask.value.position),
    position: apiTask.value.position,
    type: apiTask.value.type,
    payload: apiTask.value.payload,
    options: apiTask.value.options,
    correctAnswer: apiTask.value.correctAnswer,
    botAnswer: displayedBotAnswer.value ?? apiTask.value.botAnswer,
    botDelayMs: apiTask.value.botDelayMs,
  };
});

const hasActiveSession = computed(() => session.value?.status === 'active');
const playerAvatar = computed(() => user.value?.avatar?.trim() || null);
const isMatchActive = computed(() => screen.value === 'round' && hasActiveSession.value);
const attemptsRemaining = computed(() => status.value?.attemptsRemaining ?? 0);
const nextEntryCost = computed(() => status.value?.nextEntryCost ?? null);
const canReplay = computed(() => (
  isConnected.value
  && !isResultPending.value
  && (currentPlayMode.value === 'training'
    || (
      attemptsRemaining.value > 0
      && nextEntryCost.value !== null
      && nextEntryCost.value <= (status.value?.available ?? 0)
    ))
));
const canAnswer = computed(() => (
  !roundResolved.value
  && (
    firstSelectedAnswer.value === null
    || (
      secondAttemptAvailable.value
      && secondSelectedAnswer.value === null
    )
  )
));

const loadStatus = async (): Promise<void> => {
  if (!user.value?.id) return;
  isLoading.value = true;

  try {
    if (isConnected.value) {
      await repository.syncPending(user.value.id);
      status.value = await repository.getStatus(user.value.id, props.gameCode);
      session.value = status.value.activeSession;
      if (session.value) currentPlayMode.value = session.value.playMode;
    } else {
      session.value = await repository.getCachedSession(
        user.value.id,
        props.gameCode,
      );
    }
  } catch (error) {
    addError(getApiErrorMessage(error, 'Не удалось загрузить игру'));
  } finally {
    isLoading.value = false;
  }
};

const updateLocalAttemptsAfterStart = (): void => {
  if (!status.value || !session.value) return;
  if (session.value.playMode === 'training' || session.value.attemptNumber === null) return;
  status.value.attemptsUsed = session.value.attemptNumber;
  status.value.attemptsRemaining = Math.max(
    0,
    props.game.rules.freeGamesPerDay
      + props.game.rules.paidGamesPerDay
      - session.value.attemptNumber,
  );
  status.value.nextEntryCost = status.value.attemptsRemaining === 0
    ? null
    : props.game.rules.paidGameCost;
  status.value.available = Math.max(
    0,
    status.value.available - session.value.entryCost,
  );
};

const updateProgress = (): void => {
  if (!apiTask.value || !session.value || roundResolved.value) return;
  const elapsed = performance.now() - roundStartedAt;

  if (secondAttemptAvailable.value) {
    timerProgress.value = secondAttemptDurationMs <= 0
      ? 100
      : Math.min(
        100,
        (performance.now() - secondAttemptStartedAt)
          / secondAttemptDurationMs * 100,
      );
    return;
  }

  if (!botHasAnswered.value) {
    timerProgress.value = Math.min(100, elapsed / apiTask.value.botDelayMs * 100);
    return;
  }

  timerProgress.value = Math.min(
    100,
    (elapsed - apiTask.value.botDelayMs)
      / session.value.difficulty.answerGraceMs * 100,
  );
};

const finishMatch = async (): Promise<void> => {
  if (!session.value || !user.value?.id) return;
  clearRoundTimers();
  result.value = studentScore.value >= session.value.winningScore ? 'win' : 'loss';
  screen.value = 'result';

  if (session.value.playMode === 'training') {
    isResultPending.value = false;
    return;
  }

  isResultPending.value = true;
  const payload = {
    clientResultId: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
    rounds: rounds.value.map(round => ({...round})),
  };

  try {
    const summary = await repository.enqueueCompletion(
      user.value.id,
      session.value,
      payload,
    );
    isResultPending.value = summary.pending > 0 || summary.failed > 0;
    if (!isResultPending.value && isConnected.value) {
      status.value = await repository.getStatus(user.value.id, props.gameCode);
      session.value = null;
    }
  } catch (error) {
    isResultPending.value = true;
    addError(getApiErrorMessage(error, 'Результат сохранён, но пока не отправлен'));
  }
};

const advanceAfterRound = (): void => {
  if (!session.value) return;
  if (
    studentScore.value >= session.value.winningScore
    || computerScore.value >= session.value.winningScore
  ) {
    void finishMatch();
    return;
  }

  roundIndex.value++;
  startRound();
};

const scheduleNextRound = (delay = 1100): void => {
  nextRoundTimer = window.setTimeout(advanceAfterRound, delay);
};

const finishRound = (outcome: GrammarRaceRoundOutcome): void => {
  if (roundResolved.value || !apiTask.value || !session.value) return;
  roundResolved.value = true;
  clearRoundTimers();

  if (outcome === 'student') {
    studentScore.value++;
    studentState.value = 'correct';
    botState.value = 'incorrect';
    roundMessage.value = 'Очко ваше!';
  } else if (outcome === 'computer') {
    computerScore.value++;
    studentState.value = selectedAnswer.value === null ? 'incorrect' : studentState.value;
    botState.value = 'correct';
    roundMessage.value = 'Компьютер получает очко';
  } else {
    studentState.value = selectedAnswer.value === null ? 'incorrect' : studentState.value;
    botState.value = 'incorrect';
    roundMessage.value = 'Никто не получает очко';
  }

  rounds.value.push({
    taskPosition: apiTask.value.position,
    playerAnswer: firstSelectedAnswer.value,
    playerAnswerMs: firstSelectedAnswerMs.value,
    secondPlayerAnswer: secondSelectedAnswer.value,
    secondPlayerAnswerMs: secondSelectedAnswerMs.value,
  });

  const needsReview = props.game.requiresMistakeReview
    && needsGrammarRaceReview(apiTask.value, selectedAnswer.value);
  if (needsReview) {
    reviewVisible.value = true;
    return;
  }

  scheduleNextRound();
};

const acknowledgeReview = (): void => {
  if (!reviewVisible.value) return;
  reviewVisible.value = false;
  scheduleNextRound(200);
};

const resolveCurrentRound = (): void => {
  if (!apiTask.value || !session.value) return;
  finishRound(resolveGrammarRaceRound(
    apiTask.value,
    firstSelectedAnswer.value,
    firstSelectedAnswerMs.value,
    session.value.difficulty.answerGraceMs,
    secondSelectedAnswer.value,
    secondSelectedAnswerMs.value,
  ));
};

const handleBotAnswer = (afterEarlyMistake = false): void => {
  if (roundResolved.value || !apiTask.value || !session.value) return;
  botHasAnswered.value = true;
  displayedBotAnswer.value = grammarRaceBotDisplayAnswer(
    apiTask.value,
    afterEarlyMistake ? firstSelectedAnswer.value : null,
  );
  const botCorrect = apiTask.value.botAnswer === apiTask.value.correctAnswer;
  botState.value = botCorrect ? 'correct' : 'incorrect';

  if (botCorrect) {
    resolveCurrentRound();
    return;
  }

  if (afterEarlyMistake && firstSelectedAnswerMs.value !== null) {
    const retryWindow = grammarRaceSecondAttemptWindow(
      apiTask.value,
      firstSelectedAnswerMs.value,
      session.value.difficulty.answerGraceMs,
    );
    const elapsed = performance.now() - roundStartedAt;
    secondAttemptEndsAtMs = retryWindow.endsAtMs;
    secondAttemptDurationMs = Math.max(0, retryWindow.endsAtMs - elapsed);
    secondAttemptStartedAt = performance.now();
    secondAttemptAvailable.value = true;
    timerProgress.value = 0;
    roundMessage.value = `Компьютер ошибся — попробуйте ещё раз. У вас ${Math.ceil(secondAttemptDurationMs / 1000)} сек.`;

    if (secondAttemptDurationMs <= 0) {
      resolveCurrentRound();
      return;
    }

    graceTimer = window.setTimeout(
      resolveCurrentRound,
      secondAttemptDurationMs,
    );
    return;
  }

  const seconds = session.value.difficulty.answerGraceMs / 1000;
  roundMessage.value = `Компьютер ошибся — у вас ещё ${seconds} сек.`;

  if (selectedAnswer.value !== null) {
    resolveCurrentRound();
    return;
  }

  graceTimer = window.setTimeout(
    resolveCurrentRound,
    session.value.difficulty.answerGraceMs,
  );
};

const startRound = (): void => {
  clearRoundTimers();
  selectedAnswer.value = null;
  firstSelectedAnswer.value = null;
  firstSelectedAnswerMs.value = null;
  secondSelectedAnswer.value = null;
  secondSelectedAnswerMs.value = null;
  secondAttemptAvailable.value = false;
  displayedBotAnswer.value = null;
  secondAttemptStartedAt = 0;
  secondAttemptDurationMs = 0;
  secondAttemptEndsAtMs = 0;
  roundResolved.value = false;
  reviewVisible.value = false;
  botHasAnswered.value = false;
  botState.value = 'thinking';
  studentState.value = 'ready';
  timerProgress.value = 0;
  roundMessage.value = 'Ответьте раньше соперника';
  roundStartedAt = performance.now();

  if (!apiTask.value) return;
  botTimer = window.setTimeout(handleBotAnswer, apiTask.value.botDelayMs);
  progressTimer = window.setInterval(updateProgress, 50);
};

const answer = (value: string): void => {
  if (
    !canAnswer.value
    || !apiTask.value
    || !session.value
    || !apiTask.value.options.some(option => option.id === value)
  ) return;

  const elapsed = Math.max(0, Math.round(performance.now() - roundStartedAt));

  if (firstSelectedAnswer.value !== null) {
    if (elapsed > secondAttemptEndsAtMs) {
      secondAttemptAvailable.value = false;
      resolveCurrentRound();
      return;
    }

    secondSelectedAnswer.value = value;
    secondSelectedAnswerMs.value = elapsed;
    selectedAnswer.value = value;
    secondAttemptAvailable.value = false;
    studentState.value = value === apiTask.value.correctAnswer
      ? 'correct'
      : 'incorrect';

    if (value !== apiTask.value.correctAnswer) vibrateOnMistake();
    resolveCurrentRound();
    return;
  }

  const botCorrect = apiTask.value.botAnswer === apiTask.value.correctAnswer;
  const roundEndMs = botCorrect
    ? apiTask.value.botDelayMs
    : apiTask.value.botDelayMs + session.value.difficulty.answerGraceMs;

  if (elapsed > roundEndMs) {
    botHasAnswered.value = true;
    botState.value = botCorrect ? 'correct' : 'incorrect';
    resolveCurrentRound();
    return;
  }

  selectedAnswer.value = value;
  firstSelectedAnswer.value = value;
  firstSelectedAnswerMs.value = elapsed;
  studentState.value = value === apiTask.value.correctAnswer
    ? 'correct'
    : 'incorrect';

  if (value !== apiTask.value.correctAnswer) {
    vibrateOnMistake();
  }

  if (elapsed >= apiTask.value.botDelayMs) {
    botHasAnswered.value = true;
    botState.value = botCorrect
      ? 'correct'
      : 'incorrect';
    resolveCurrentRound();
    return;
  }

  if (value === apiTask.value.correctAnswer) {
    finishRound('student');
  } else {
    if (botTimer !== null) window.clearTimeout(botTimer);
    roundMessage.value = 'Неверно. Компьютер отвечает…';
    botTimer = window.setTimeout(
      () => handleBotAnswer(true),
      grammarRaceRetryBotDelayMs,
    );
  }
};

const begin = (): void => {
  if (!session.value) return;
  currentPlayMode.value = session.value.playMode;
  studentScore.value = 0;
  computerScore.value = 0;
  roundIndex.value = 0;
  rounds.value = [];
  result.value = 'loss';
  isResultPending.value = false;
  reviewVisible.value = false;
  screen.value = 'round';
  startRound();
};

const startOrResume = async (playMode: GrammarRacePlayMode = 'competitive'): Promise<void> => {
  if (!user.value?.id) return;
  if (session.value?.status === 'active') {
    begin();
    return;
  }

  isLoading.value = true;
  try {
    session.value = await repository.start(user.value.id, props.gameCode, playMode);
    updateLocalAttemptsAfterStart();
    begin();
  } catch (error) {
    addError(getApiErrorMessage(error, 'Не удалось начать игру'));
    if (isConnected.value) await loadStatus();
  } finally {
    isLoading.value = false;
  }
};

const replay = async (): Promise<void> => {
  screen.value = 'lobby';
  session.value = null;
  await loadStatus();
  if (canReplay.value) await startOrResume(currentPlayMode.value);
};

const requestExit = (destination = '/games'): void => {
  pendingDestination.value = destination;
  exitDialog.value = true;
};

const confirmExit = async (): Promise<void> => {
  if (
    session.value
    && session.value.playMode !== 'training'
    && user.value?.id
  ) {
    try {
      await repository.enqueue(
        user.value.id,
        session.value,
        'abandon',
        {
          clientResultId: crypto.randomUUID(),
          abandonedAt: new Date().toISOString(),
        },
      );
      if (isConnected.value) void repository.syncPending(user.value.id);
    } catch (error) {
      addError(getApiErrorMessage(error, 'Не удалось сохранить выход из игры'));
      return;
    }
  }

  clearRoundTimers();
  allowNavigation.value = true;
  await router.push(pendingDestination.value);
};

const finish = async (): Promise<void> => {
  allowNavigation.value = true;
  await router.push('/games');
};

const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (!isMatchActive.value) return;
  event.preventDefault();
  event.returnValue = '';
};

onBeforeRouteLeave(to => {
  if (!isMatchActive.value || allowNavigation.value) return true;
  requestExit(to.fullPath);

  return false;
});

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  await loadStatus();
});

onBeforeUnmount(() => {
  clearRoundTimers();
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <div class="grammar-race-game mx-auto">
    <GrammarRaceLobbyScreen
      v-if="screen === 'lobby'"
      :available-coins="status?.available ?? 0"
      :current-level="status?.currentLevel ?? session?.difficulty.level ?? 1"
      :game="game"
      :has-active-session="hasActiveSession"
      :active-play-mode="session?.playMode ?? 'competitive'"
      :is-available="status?.isAvailable ?? ((user?.grade ?? 0) >= game.minGrade)"
      :min-grade="status?.minGrade ?? game.minGrade"
      :is-connected="isConnected"
      :is-loading="isLoading"
      :next-entry-cost="status?.nextEntryCost ?? null"
      @back="finish"
      @start="startOrResume"
    ></GrammarRaceLobbyScreen>

    <GrammarRaceRoundScreen
      v-else-if="screen === 'round' && task && session"
      :bot-state="botState"
      :bot-has-answered="botHasAnswered"
      :computer-score="computerScore"
      :game="game"
      :is-answer-locked="!canAnswer"
      :player-score="studentScore"
      :player-avatar="playerAvatar"
      :student-name="user?.name?.trim() || 'Вы'"
      :round-message="roundMessage"
      :round-number="rounds.length + 1"
      :round-resolved="roundResolved"
      :review-visible="reviewVisible"
      :selected-answer="selectedAnswer"
      :student-state="studentState"
      :task="task"
      :timer-progress="timerProgress"
      @answer="answer"
      @acknowledge-review="acknowledgeReview"
    ></GrammarRaceRoundScreen>

    <GrammarRaceResultScreen
      v-else-if="screen === 'result'"
      :can-replay="canReplay"
      :computer-score="computerScore"
      :game="game"
      :is-result-pending="isResultPending"
      :is-training="currentPlayMode === 'training'"
      :player-score="studentScore"
      :student-name="user?.name?.trim() || 'Вы'"
      :replay-cost="nextEntryCost"
      :result="result"
      @finish="finish"
      @replay="replay"
    ></GrammarRaceResultScreen>

    <IConfirmDialog
      v-model="exitDialog"
      no-button-text="Продолжить игру"
      :text="currentPlayMode === 'training'
        ? 'Тренировка будет завершена без результата.'
        : 'Выход будет засчитан как поражение. Бесплатная попытка будет использована, а потраченная монета не возвращается.'"
      title="Выйти из игры?"
      yes-button-text="Выйти"
      @yes="confirmExit"
    ></IConfirmDialog>
  </div>
</template>

<style scoped>
.grammar-race-game {
  max-width: 440px;
}
</style>
