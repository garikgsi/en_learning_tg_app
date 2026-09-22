import {describe, expect, it} from 'vitest';
import {
  grammarRaceRoundEndMs,
  resolveGrammarRaceRound,
} from '@/components/games/grammar-race/engine';
import type {GrammarRaceApiTask} from '@/api/types/grammarRace';

const task = (botAnswer: GrammarRaceApiTask['botAnswer']): GrammarRaceApiTask => ({
  position: 1,
  prompt: 'My brother',
  translation: 'Мой брат',
  correctAnswer: 'he',
  botAnswer,
  botDelayMs: 4000,
});

describe('grammar race engine', () => {
  it('gives a tie to the student', () => {
    expect(resolveGrammarRaceRound(task('he'), 'he', 4000, 5000))
      .toBe('student');
  });

  it('gives a correct faster bot the point', () => {
    expect(resolveGrammarRaceRound(task('he'), 'he', 4001, 5000))
      .toBe('computer');
    expect(resolveGrammarRaceRound(task('he'), 'she', 1000, 5000))
      .toBe('computer');
  });

  it('allows a correct answer during the post-error window', () => {
    expect(resolveGrammarRaceRound(task('she'), 'he', 9000, 5000))
      .toBe('student');
    expect(resolveGrammarRaceRound(task('she'), 'he', 14000, 10000))
      .toBe('student');
  });

  it('awards nobody when both answers are wrong or absent', () => {
    expect(resolveGrammarRaceRound(task('she'), 'it', 1000, 5000))
      .toBe('no_score');
    expect(resolveGrammarRaceRound(task('she'), null, null, 5000))
      .toBe('no_score');
  });

  it('uses the bot answer to determine the end time', () => {
    expect(grammarRaceRoundEndMs(task('he'), 5000)).toBe(4000);
    expect(grammarRaceRoundEndMs(task('she'), 5000)).toBe(9000);
    expect(grammarRaceRoundEndMs(task('she'), 10000)).toBe(14000);
  });
});
