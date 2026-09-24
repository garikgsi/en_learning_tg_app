import type {GrammarRaceDefinition} from '../grammar-race/types';

const options = ['am', 'is', 'are']
  .map(id => ({id, label: id}));

export const toBeRace = {
  id: 'to-be',
  groupTitle: 'Грамматические гонки',
  rankTitle: 'Знаток глагола to be',
  title: 'Форма глагола to be',
  description: 'Выбирайте am, is, are, а на сложных уровнях — was или were',
  minGrade: 2,
  instruction: 'Выберите правильную форму глагола to be',
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
      id: 'school-today',
      type: 'single_choice',
      payload: {
        text: 'I ___ at school today.',
        translation: 'Я сегодня в школе.',
        instruction: 'Выберите правильную форму глагола to be',
        feedback: {
          correctText: 'I am at school today.',
          translation: 'Я сегодня в школе.',
          explanation: 'В настоящем времени с I используем форму am.',
        },
      },
      options,
      correctAnswer: 'am',
    },
  ],
} satisfies GrammarRaceDefinition;
