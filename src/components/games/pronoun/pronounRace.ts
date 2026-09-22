import type {GrammarRaceDefinition} from '../grammar-race/types';

export const pronounRace = {
  id: 'subject-pronouns',
  groupTitle: 'Грамматические гонки',
  rankTitle: 'Гонщик местоимений',
  title: 'Гонка местоимений',
  description: 'Выбирайте правильное местоимение быстрее компьютера',
  instruction: 'Выберите местоимение',
  rules: {
    targetScore: 5,
    freeGamesPerDay: 1,
    paidGamesPerDay: 2,
    paidGameCost: 1,
    winReward: 2,
  },
  tasks: [
    {
      id: 'sister',
      prompt: 'A sister ___',
      choices: ['he', 'she', 'it', 'we', 'they'],
      correctAnswer: 'she',
    },
    {
      id: 'cat',
      prompt: 'Cat ___',
      choices: ['he', 'she', 'it', 'we', 'they'],
      correctAnswer: 'it',
    },
    {
      id: 'kate-and-peter',
      prompt: 'Kate and Peter ___',
      choices: ['he', 'she', 'it', 'we', 'they'],
      correctAnswer: 'they',
    },
    {
      id: 'mother',
      prompt: 'Mother ___',
      choices: ['he', 'she', 'it', 'we', 'they'],
      correctAnswer: 'she',
    },
    {
      id: 'car',
      prompt: 'Car ___',
      choices: ['he', 'she', 'it', 'we', 'they'],
      correctAnswer: 'it',
    },
  ],
} satisfies GrammarRaceDefinition;
