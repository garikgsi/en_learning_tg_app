import {describe, expect, it} from 'vitest';
import {
  grammarRaceBotDisplayAnswer,
  grammarRaceRoundEndMs,
  grammarRaceSecondAttemptWindow,
  needsGrammarRaceReview,
  resolveGrammarRaceRound,
} from '@/components/games/grammar-race/engine';
import type {GrammarRaceApiTask} from '@/api/types/grammarRace';

const task = (botAnswer: GrammarRaceApiTask['botAnswer']): GrammarRaceApiTask => ({
  position: 1,
  type: 'single_choice',
  payload: {text: 'My brother', translation: 'Мой брат'},
  options: ['he', 'she', 'it', 'we', 'they'].map(id => ({id, label: id})),
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

  it('preserves the original deadline for a second attempt after an early mistake', () => {
    expect(grammarRaceSecondAttemptWindow(task('she'), 1000, 5000)).toEqual({
      startsAtMs: 1500,
      durationMs: 7500,
      endsAtMs: 9000,
    });
    expect(grammarRaceRoundEndMs(task('she'), 5000, 'it', 1000)).toBe(9000);
    expect(resolveGrammarRaceRound(
      task('she'),
      'it',
      1000,
      5000,
      'he',
      1500,
    )).toBe('student');
  });

  it('finishes after 500 ms when the accelerated bot answer is correct', () => {
    expect(grammarRaceRoundEndMs(task('he'), 5000, 'it', 1000)).toBe(1500);
    expect(resolveGrammarRaceRound(
      task('he'),
      'it',
      1000,
      5000,
    )).toBe('computer');
  });

  it('generates the displayed wrong bot answer without repeating the student mistake', () => {
    expect(grammarRaceBotDisplayAnswer(task('she'), 'she', () => 0)).toBe('it');
    expect(grammarRaceBotDisplayAnswer(task('she'), 'it', () => 0)).toBe('she');
    expect(grammarRaceBotDisplayAnswer(task('he'), 'she', () => 0)).toBe('he');
  });

  it('reviews only an incorrect or missed grammar answer with feedback', () => {
    const articleTask = task('she');
    articleTask.payload.feedback = {
      correctText: 'he',
      explanation: 'Правило',
    };

    expect(needsGrammarRaceReview(articleTask, 'she')).toBe(true);
    expect(needsGrammarRaceReview(articleTask, null)).toBe(true);
    expect(needsGrammarRaceReview(articleTask, 'he')).toBe(false);
    delete articleTask.payload.feedback;
    expect(needsGrammarRaceReview(articleTask, 'she')).toBe(false);
  });
});
