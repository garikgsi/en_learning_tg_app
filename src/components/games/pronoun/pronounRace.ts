import type {GrammarRaceDefinition} from '../grammar-race/types';

export const pronounRace = {
  id: 'subject-pronouns',
  groupTitle: 'Грамматические гонки',
  rankTitle: 'Гонщик местоимений',
  title: 'Гонка местоимений',
  description: 'Выбирайте правильное местоимение быстрее компьютера',
  minGrade: 2,
  instruction: 'Выберите местоимение',
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
      id: 'sister',
      type: 'single_choice',
      payload: {text: 'A sister ___', translation: null},
      options: ['he', 'she', 'it', 'we', 'they'].map(id => ({id, label: id})),
      correctAnswer: 'she',
    },
    {
      id: 'cat',
      type: 'single_choice',
      payload: {text: 'Cat ___', translation: null},
      options: ['he', 'she', 'it', 'we', 'they'].map(id => ({id, label: id})),
      correctAnswer: 'it',
    },
    {
      id: 'kate-and-peter',
      type: 'single_choice',
      payload: {text: 'Kate and Peter ___', translation: null},
      options: ['he', 'she', 'it', 'we', 'they'].map(id => ({id, label: id})),
      correctAnswer: 'they',
    },
    {
      id: 'mother',
      type: 'single_choice',
      payload: {text: 'Mother ___', translation: null},
      options: ['he', 'she', 'it', 'we', 'they'].map(id => ({id, label: id})),
      correctAnswer: 'she',
    },
    {
      id: 'car',
      type: 'single_choice',
      payload: {text: 'Car ___', translation: null},
      options: ['he', 'she', 'it', 'we', 'they'].map(id => ({id, label: id})),
      correctAnswer: 'it',
    },
  ],
} satisfies GrammarRaceDefinition;
