import {articleRace} from '@/components/games/article/articleRace';
import {possessivePronounRace} from '@/components/games/possessive-pronoun/possessivePronounRace';
import {pronounRace} from '@/components/games/pronoun/pronounRace';
import {toBeRace} from '@/components/games/to-be/toBeRace';

export type GameRecommendation = {
  title: string
  slogan: string
  route: string
  minGrade: number
};

type GameVisitMap = Record<string, number>;

const storageKeyPrefix = 'en-learning:game-visits';

export const gameRecommendations: GameRecommendation[] = [
  {
    title: 'Такса Альфа',
    slogan: 'Помоги Альфе допрыгнуть до кости',
    route: '/games/dachshund',
    minGrade: 0,
  },
  {
    title: pronounRace.title,
    slogan: 'Выбери правильные местоимения и обгони робота',
    route: '/games/pronoun',
    minGrade: pronounRace.minGrade,
  },
  {
    title: articleRace.title,
    slogan: 'Расставь артикли быстрее компьютера',
    route: '/games/articles',
    minGrade: articleRace.minGrade,
  },
  {
    title: possessivePronounRace.title,
    slogan: 'Покажи, чей это предмет, и первым доберись до финиша',
    route: '/games/possessive-pronoun',
    minGrade: possessivePronounRace.minGrade,
  },
  {
    title: toBeRace.title,
    slogan: 'Выбери am, is или are быстрее робота',
    route: '/games/to-be',
    minGrade: toBeRace.minGrade,
  },
];

const storageKey = (userId: string): string => `${storageKeyPrefix}:${userId}`;

const readVisits = (userId: string): GameVisitMap => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '{}');

    return value && typeof value === 'object' ? value as GameVisitMap : {};
  } catch {
    return {};
  }
};

export const recordGameVisit = (
  userId: string,
  route: string,
  visitedAt = Date.now(),
): void => {
  if (!gameRecommendations.some(game => game.route === route)) {
    return;
  }

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({
      ...readVisits(userId),
      [route]: visitedAt,
    }));
  } catch {
    // A recommendation can still be shown without persisted visit history.
  }
};

export const getLeastRecentlyVisitedGame = (
  userId: string,
  grade: number,
): GameRecommendation => {
  const visits = readVisits(userId);
  const availableGames = gameRecommendations.filter(game => grade >= game.minGrade);

  return availableGames.reduce((oldest, game) => {
    const oldestVisit = visits[oldest.route] ?? Number.NEGATIVE_INFINITY;
    const gameVisit = visits[game.route] ?? Number.NEGATIVE_INFINITY;

    return gameVisit < oldestVisit ? game : oldest;
  }, availableGames[0] ?? gameRecommendations[0]);
};
