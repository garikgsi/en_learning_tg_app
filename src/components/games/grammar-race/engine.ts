import type {GrammarRaceApiTask} from '@/api/types/grammarRace';

export type GrammarRaceRoundOutcome = 'student' | 'computer' | 'no_score'

export const grammarRaceRetryBotDelayMs = 500;

export const grammarRaceBotDisplayAnswer = (
  task: GrammarRaceApiTask,
  excludedAnswer: string | null = null,
  random: () => number = Math.random,
): string => {
  if (task.botAnswer === task.correctAnswer) return task.correctAnswer;

  const wrongAnswers = task.options.filter(option => (
    option.id !== excludedAnswer && option.id !== task.correctAnswer
  ));
  if (wrongAnswers.length > 0) {
    return wrongAnswers[Math.floor(random() * wrongAnswers.length)].id;
  }

  return task.botAnswer;
};

export const grammarRaceSecondAttemptWindow = (
  task: GrammarRaceApiTask,
  firstAnswerMs: number,
  answerGraceMs: number,
): {startsAtMs: number, durationMs: number, endsAtMs: number} => {
  const startsAtMs = firstAnswerMs + grammarRaceRetryBotDelayMs;
  const endsAtMs = task.botDelayMs + answerGraceMs;

  return {
    startsAtMs,
    durationMs: Math.max(0, endsAtMs - startsAtMs),
    endsAtMs,
  };
};

export const resolveGrammarRaceRound = (
  task: GrammarRaceApiTask,
  answer: string | null,
  answerMs: number | null,
  answerGraceMs: number,
  secondAnswer: string | null = null,
  secondAnswerMs: number | null = null,
): GrammarRaceRoundOutcome => {
  const playerCorrect = answer !== null
    && answerMs !== null
    && answer === task.correctAnswer;
  const earlyMistake = answer !== null
    && answerMs !== null
    && !playerCorrect
    && answerMs < task.botDelayMs;
  const botCorrect = task.botAnswer === task.correctAnswer;

  if (playerCorrect && answerMs <= task.botDelayMs) return 'student';
  if (earlyMistake) {
    if (botCorrect) return 'computer';

    const window = grammarRaceSecondAttemptWindow(
      task,
      answerMs,
      answerGraceMs,
    );
    if (
      secondAnswer === task.correctAnswer
      && secondAnswerMs !== null
      && secondAnswerMs >= window.startsAtMs
      && secondAnswerMs <= window.endsAtMs
    ) return 'student';

    return 'no_score';
  }

  if (botCorrect) return 'computer';
  if (
    playerCorrect
    && answerMs <= task.botDelayMs + answerGraceMs
  ) return 'student';

  return 'no_score';
};

export const grammarRaceRoundEndMs = (
  task: GrammarRaceApiTask,
  answerGraceMs: number,
  answer: string | null = null,
  answerMs: number | null = null,
): number => {
  if (
    answer !== null
    && answerMs !== null
    && answer !== task.correctAnswer
    && answerMs < task.botDelayMs
  ) {
    return task.botAnswer === task.correctAnswer
      ? answerMs + grammarRaceRetryBotDelayMs
      : task.botDelayMs + answerGraceMs;
  }

  return task.botAnswer === task.correctAnswer
    ? task.botDelayMs
    : task.botDelayMs + answerGraceMs;
};

export const needsGrammarRaceReview = (
  task: GrammarRaceApiTask,
  answer: string | null,
): boolean => {
  return answer !== task.correctAnswer && task.payload.feedback !== undefined;
};
