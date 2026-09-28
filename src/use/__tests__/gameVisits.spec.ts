import {beforeEach, describe, expect, it} from 'vitest';
import {
  getLeastRecentlyVisitedGame,
  recordGameVisit,
} from '@/use/gameVisits';

describe('game visit recommendations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recommends the least recently visited game available for the grade', () => {
    const userId = 'student-1';

    expect(getLeastRecentlyVisitedGame(userId, 2).route).toBe('/games/dachshund');

    recordGameVisit(userId, '/games/dachshund', 100);
    expect(getLeastRecentlyVisitedGame(userId, 2).route).toBe('/games/pronoun');

    recordGameVisit(userId, '/games/pronoun', 200);
    expect(getLeastRecentlyVisitedGame(userId, 2).route).toBe('/games/to-be');

    recordGameVisit(userId, '/games/to-be', 300);
    expect(getLeastRecentlyVisitedGame(userId, 2).route).toBe('/games/dachshund');
  });

  it('keeps visit history separate for each user', () => {
    recordGameVisit('student-1', '/games/dachshund', 100);

    expect(getLeastRecentlyVisitedGame('student-1', 2).route).toBe('/games/pronoun');
    expect(getLeastRecentlyVisitedGame('student-2', 2).route).toBe('/games/dachshund');
  });

  it('ignores routes that are not games', () => {
    recordGameVisit('student-1', '/statistics', 100);

    expect(localStorage.length).toBe(0);
  });
});
