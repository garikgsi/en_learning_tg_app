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

const task = (botAnswer: string): GrammarRaceTask => ({
  id: 'brother',
  type: 'single_choice',
  payload: {text: 'My brother', translation: 'Мой брат'},
  options: ['he', 'she', 'it', 'we', 'they'].map(id => ({id, label: id})),
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

  it('keeps a visible space after blanks in article and possessive-pronoun tasks', async () => {
    const articleTask = task('an');
    articleTask.payload.text = '___ aunt';
    articleTask.options = ['a', 'an', 'the', 'none'].map(id => ({
      id,
      label: id === 'none' ? 'артикль не нужен' : id,
    }));
    articleTask.correctAnswer = 'an';
    wrapper = mountScreen({task: articleTask});

    const phrase = () => wrapper!.get('.pronoun-round__phrase').text()
      .replace(/\u00a0/g, ' ');
    expect(phrase()).toBe('___ aunt');
    expect(wrapper.findAll('.pronoun-round__answer')).toHaveLength(4);
    const noArticle = wrapper.get('[aria-label="артикль не нужен"]');
    expect(noArticle.text()).toBe('артикль не нужен');
    expect(noArticle.get('.pronoun-round__answer-label--compact').classes())
      .toContain('pronoun-round__answer-label--compact');

    const possessiveTask = task('her');
    possessiveTask.payload.text = 'Kate has got a dog. ___ dog is friendly.';
    possessiveTask.options = ['my', 'your', 'his', 'her', 'its', 'our', 'their']
      .map(id => ({id, label: id}));
    possessiveTask.correctAnswer = 'her';
    await wrapper.setProps({task: possessiveTask});

    expect(phrase()).toBe('Kate has got a dog. ___ dog is friendly.');

    const toBeTask = task('is');
    toBeTask.payload.text = 'She ___ at school today.';
    toBeTask.payload.translation = 'Она сегодня в школе.';
    toBeTask.options = ['am', 'is', 'are', 'was', 'were']
      .map(id => ({id, label: id}));
    toBeTask.correctAnswer = 'is';
    await wrapper.setProps({task: toBeTask});

    expect(phrase()).toBe('She ___ at school today.');
    expect(wrapper.text()).toContain('Она сегодня в школе.');
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

  it('keeps the mistake explanation open until the student understands it', async () => {
    const articleTask = task('she');
    articleTask.payload.feedback = {
      correctText: 'an apple',
      translation: 'яблоко',
      explanation: 'Перед гласным звуком ставим an.',
    };
    wrapper = mountScreen({task: articleTask, reviewVisible: true});
    await flushPromises();

    expect(document.body.textContent).toContain('Правильный вариант');
    expect(document.body.textContent).toContain('an apple');
    expect(document.body.textContent).toContain('яблоко');
    expect(document.body.textContent).toContain('Перед гласным звуком ставим an.');

    expect(wrapper.getComponent({name: 'VDialog'}).props('contained')).toBe(true);
    const button = wrapper.getComponent({name: 'VBtn'});
    expect(button.props('color')).toBe('success');
    await button.trigger('click');
    expect(wrapper.emitted('acknowledgeReview')).toHaveLength(1);
  });

  it('shows a Russian fallback for an active personal-pronoun session', async () => {
    const personalTask = task('she');
    personalTask.payload.feedback = {
      correctText: 'My brother → he',
      explanation: 'Вместо имени одного мальчика используем «он» — he.',
    };
    wrapper = mountScreen({task: personalTask, reviewVisible: true});
    await flushPromises();

    expect(document.body.textContent).toContain('Мой брат → он');
  });
});
