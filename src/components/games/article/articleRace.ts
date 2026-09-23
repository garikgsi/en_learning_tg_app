import type {GrammarRaceDefinition} from '../grammar-race/types';

const options = [
  {id: 'a', label: 'a'},
  {id: 'an', label: 'an'},
  {id: 'the', label: 'the'},
  {id: 'none', label: 'артикль не нужен'},
];

export const articleRace = {
  id: 'articles',
  groupTitle: 'Грамматические гонки',
  rankTitle: 'Знаток артиклей',
  title: 'Гонка артиклей',
  description: 'Выбирайте a, an, the или вариант без артикля быстрее компьютера',
  minGrade: 3,
  instruction: 'Выберите правильный артикль',
  requiresMistakeReview: true,
  rules: {
    targetScore: 5,
    freeGamesPerDay: 1,
    paidGamesPerDay: 2,
    paidGameCost: 1,
    winReward: 2,
  },
  tasks: [
    {
      id: 'apple',
      type: 'single_choice',
      payload: {
        text: '___ apple',
        translation: 'яблоко',
        instruction: 'Выберите правильный артикль',
        feedback: {
          correctText: 'an apple',
          translation: 'яблоко',
          explanation: 'Перед гласным звуком ставим an.',
        },
      },
      options,
      correctAnswer: 'an',
    },
  ],
} satisfies GrammarRaceDefinition;
