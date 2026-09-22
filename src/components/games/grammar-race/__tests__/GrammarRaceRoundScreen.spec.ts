import {afterEach, describe, expect, it} from 'vitest';
import {flushPromises, mount, type VueWrapper} from '@vue/test-utils';
import {nextTick} from 'vue';
import {createVuetify} from 'vuetify';
import GrammarRaceRoundScreen from '@/components/games/grammar-race/GrammarRaceRoundScreen.vue';
import type {
  GrammarRaceDefinition,
  GrammarRaceTask,
} from '@/components/games/grammar-race/types';

const game: GrammarRaceDefinition = {
  id: 'subject-pronouns',
  groupTitle: 'Грамматические гонки',
  rankTitle: 'Гонщик местоимений',
  title: 'Гонка местоимений',
  description: 'Выберите правильное местоимение',
  instruction: 'Выберите местоимение',
  tasks: [],
  rules: {
    targetScore: 5,
    freeGamesPerDay: 1,
    paidGamesPerDay: 2,
    paidGameCost: 1,
    winReward: 2,
  },
};

const task = (botAnswer: string): GrammarRaceTask => ({
  id: 'brother',
  prompt: 'My brother',
  translation: 'Мой брат',
  choices: ['he', 'she', 'it', 'we', 'they'],
  correctAnswer: 'he',
  botAnswer,
  botDelayMs: 4000,
});

const mountScreen = (overrides: Record<string, unknown> = {}) => mount(
  GrammarRaceRoundScreen,
  {
    attachTo: document.body,
    global: {plugins: [createVuetify()]},
    props: {
      game,
      task: task('she'),
      playerScore: 0,
      computerScore: 0,
      roundNumber: 1,
      ...overrides,
    },
  },
);

describe('GrammarRaceRoundScreen', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it('always marks the answer selected by the computer', () => {
    wrapper = mountScreen({botHasAnswered: true});

    const answer = wrapper.get('[aria-label="she, ответ компьютера"]');

    expect(answer.classes()).toContain('pronoun-round__answer--bot-selected');
    expect(answer.find('.pronoun-round__bot-answer-icon').exists()).toBe(true);
  });

  it('updates the computer score only after the yellow point arrives', async () => {
    wrapper = mountScreen({task: task('he')});
    const computerScore = () => wrapper!
      .findAll('.pronoun-round__score-player')[1]
      .get('.pronoun-player-score__value');

    await wrapper.setProps({
      botHasAnswered: true,
      botState: 'correct',
      computerScore: 1,
      roundResolved: true,
    });
    await flushPromises();

    expect(computerScore().text()).toBe('0');
    const point = document.body.querySelector(
      '.pronoun-round__score-flight--computer',
    );
    expect(point).not.toBeNull();

    point!.dispatchEvent(new Event('animationend'));
    await nextTick();

    expect(computerScore().text()).toBe('1');
  });
});
