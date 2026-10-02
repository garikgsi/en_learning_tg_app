import {describe, expect, it} from 'vitest';
import {exerciseEnCoinReward} from '@/use/exerciseReward';

describe('exerciseEnCoinReward', () => {
  const now = new Date(2026, 9, 2, 12);

  it('returns the weekly reward', () => {
    expect(exerciseEnCoinReward('weekly', '2026-09-28T00:00:00+03:00', now))
      .toBe(5);
  });

  it('includes the deadline bonus for current daily and plural exercises', () => {
    expect(exerciseEnCoinReward('daily', '2026-10-02T00:00:00+03:00', now))
      .toBe(2);
    expect(exerciseEnCoinReward('plural', '2026-10-03T00:00:00+03:00', now))
      .toBe(2);
  });

  it('returns the base reward for an overdue daily exercise', () => {
    expect(exerciseEnCoinReward('daily', '2026-10-01T00:00:00+03:00', now))
      .toBe(1);
  });

  it('does not promise a reward for user-created exercises', () => {
    expect(exerciseEnCoinReward('user', '2026-10-02T00:00:00+03:00', now))
      .toBe(0);
  });
});
