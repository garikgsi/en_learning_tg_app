import {afterEach, describe, expect, it} from 'vitest';
import {mount, type VueWrapper} from '@vue/test-utils';
import {createVuetify} from 'vuetify';
import GrammarRaceResultScreen from '@/components/games/grammar-race/GrammarRaceResultScreen.vue';
import type {GrammarRaceDefinition} from '@/components/games/grammar-race/types';

const game: GrammarRaceDefinition = {
  id: 'subject-pronouns',
  groupTitle: 'Грамматические гонки',
  rankTitle: 'Гонщик местоимений',
  title: 'Гонка местоимений',
  description: 'Выберите правильное местоимение',
  minGrade: 2,
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

const mountScreen = (isTraining: boolean) => mount(
  GrammarRaceResultScreen,
  {
    global: {plugins: [createVuetify()]},
    props: {
      game,
      result: 'win',
      playerScore: 5,
      computerScore: 2,
      isResultPending: true,
      isTraining,
    },
  },
);

describe('GrammarRaceResultScreen', () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it('does not show synchronization status after training', () => {
    wrapper = mountScreen(true);

    expect(wrapper.text()).not.toContain('будет отправлен после восстановления связи');
  });

  it('shows synchronization status for a pending competitive result', () => {
    wrapper = mountScreen(false);

    expect(wrapper.text()).toContain('будет отправлен после восстановления связи');
  });
});
