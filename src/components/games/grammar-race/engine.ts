import type {
  GrammarRaceApiTask,
  PersonalPronoun,
} from '@/api/types/grammarRace';

export type GrammarRaceRoundOutcome = 'student' | 'computer' | 'no_score'

export const resolveGrammarRaceRound = (
  task: GrammarRaceApiTask,
  answer: PersonalPronoun | null,
  answerMs: number | null,
  answerGraceMs: number,
): GrammarRaceRoundOutcome => {
  const playerCorrect = answer !== null
    && answerMs !== null
    && answer === task.correctAnswer;
  const botCorrect = task.botAnswer === task.correctAnswer;

  if (playerCorrect && answerMs <= task.botDelayMs) return 'student';
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
): number => {
  return task.botAnswer === task.correctAnswer
    ? task.botDelayMs
    : task.botDelayMs + answerGraceMs;
};
