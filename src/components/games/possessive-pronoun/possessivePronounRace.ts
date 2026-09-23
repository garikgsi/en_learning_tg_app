import type {GrammarRaceDefinition} from '../grammar-race/types';

const options = ['my', 'your', 'his', 'her', 'its', 'our', 'their']
  .map(id => ({id, label: id}));

export const possessivePronounRace = {
  id: 'possessive-pronouns',
  groupTitle: 'Грамматические гонки',
  rankTitle: 'Знаток притяжательных местоимений',
  title: 'Притяжательные местоимения',
  description: 'Выбирайте my, your, his, her, its, our или their быстрее компьютера',
  minGrade: 5,
  instruction: 'Выберите притяжательное местоимение',
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
      id: 'kate-dog',
      type: 'single_choice',
      payload: {
        text: 'Kate has got a dog. ___ dog is friendly.',
        translation: null,
      },
      options,
      correctAnswer: 'her',
    },
  ],
} satisfies GrammarRaceDefinition;
