import {mount, flushPromises} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {createRouter, createMemoryHistory, RouterView} from 'vue-router';
import {createVuetify} from 'vuetify';
import {VApp} from 'vuetify/components';
import {h} from 'vue';
import IAdminDailyAssignment from '@/components/IAdminDailyAssignment.vue';
import IChipWord from '@/components/IChipWord.vue';
import {httpAdminExerciseDriver} from '@/api/http/adminExercise';
import {useUserStore} from '@/stores/userStore';
import type {ApiDictionaryWord} from '@/api/types/dictionary';
import type {Exercise} from '@/api/types/exercise';

const recipient = {id: 'recipient', name: 'Анна', phone: '+79990000001', grade: 5, totalEarnedCoins: 0};
const phrase: ApiDictionaryWord = {
  id: 42, en: 'good morning', ru: 'доброе утро', enVariants: [], ruVariants: [],
  transcription: '/ɡʊd ˈmɔːnɪŋ/', grade: 99, createdAt: '2026-09-18T00:00:00Z',
  repeatCount: 0, successfulRepeatCount: 0, failedRepeatCount: 0, is_active: false,
};
const page = {items: [phrase], total: 1, page: 1, perPage: 30, lastPage: 1, availableGrade: null};
const exercise: Exercise = {id: 8, userId: recipient.id, type: {id: 1, name: 'daily', title: 'Ежедневные'}, dueDate: phrase.createdAt, createdAt: phrase.createdAt, items: [{id: 1, word: phrase}]};
let wrapper: ReturnType<typeof mount> | null = null;
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: vi.fn().mockImplementation(media => ({
    matches: false, media, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  }))});
});
afterEach(() => { wrapper?.unmount(); wrapper = null; vi.restoreAllMocks(); });

const openForm = async (role: 'admin' | 'user' = 'admin') => {
  const pinia = createPinia();
  setActivePinia(pinia);
  useUserStore().user = {id: 'admin', name: 'Admin', phone: '+79990000000', role, avatar: '', createdAt: phrase.createdAt};
  const router = createRouter({history: createMemoryHistory(), routes: [
    {path: '/statistics', component: {template: '<p>Статистика</p>'}},
    {path: '/statistics/daily/new', component: IAdminDailyAssignment},
  ]});
  await router.push('/statistics/daily/new');
  await router.isReady();
  wrapper = mount(VApp, {attachTo: document.body, slots: {default: () => h(RouterView)}, global: {plugins: [pinia, createVuetify(), router]}});
  await flushPromises();
  return router;
};
const autocompletes = () => wrapper!.findAllComponents({name: 'VAutocomplete'});
const selectRecipientAndWords = async () => {
  autocompletes()[0]!.vm.$emit('update:modelValue', recipient);
  autocompletes()[1]!.vm.$emit('update:modelValue', [phrase]);
  await flushPromises();
};

describe('admin daily assignment', () => {
  it('searches either language, displays phrases as removable chips and submits replacement', async () => {
    vi.spyOn(httpAdminExerciseDriver, 'getUsers').mockResolvedValue([recipient]);
    const searchWords = vi.spyOn(httpAdminExerciseDriver, 'searchWords').mockResolvedValue(page);
    const assign = vi.spyOn(httpAdminExerciseDriver, 'assign').mockResolvedValue({item: exercise, wasReplaced: true});
    const router = await openForm();
    for (const query of ['доброе утро', 'good morning']) {
      autocompletes()[1]!.vm.$emit('update:search', query);
      await vi.waitFor(() => expect(searchWords).toHaveBeenCalledWith(query));
    }
    await selectRecipientAndWords();
    expect(wrapper!.findComponent(IChipWord).props('word')).toBe('good morning');
    expect(wrapper!.text()).not.toContain('Пройти упражнение?');
    const dateField = wrapper!.findAllComponents({name: 'VTextField'}).find(field => field.props('label') === 'Дата задания');
    await dateField!.get('input').trigger('click');
    await flushPromises();
    wrapper!.findComponent({name: 'VDatePicker'}).vm.$emit('update:modelValue', new Date(2026, 9, 5));
    await flushPromises();
    expect(dateField!.props('modelValue')).toBe('05.10.2026');
    wrapper!.findComponent({name: 'VCheckbox'}).vm.$emit('update:modelValue', true);
    await flushPromises();
    await wrapper!.get('form').trigger('submit');
    await flushPromises();
    expect(assign).toHaveBeenCalledWith({userId: recipient.id, wordIds: [42], dueDate: '2026-10-05', replaceExisting: true});
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/statistics'));
  });

  it('removes selected words and prevents creation without a user or words', async () => {
    vi.spyOn(httpAdminExerciseDriver, 'getUsers').mockResolvedValue([recipient]);
    vi.spyOn(httpAdminExerciseDriver, 'searchWords').mockResolvedValue(page);
    const assign = vi.spyOn(httpAdminExerciseDriver, 'assign');
    await openForm();
    await wrapper!.get('form').trigger('submit');
    expect(assign).not.toHaveBeenCalled();
    await selectRecipientAndWords();
    wrapper!.findComponent(IChipWord).vm.$emit('close');
    await flushPromises();
    expect(wrapper!.findComponent(IChipWord).exists()).toBe(false);
    await wrapper!.get('form').trigger('submit');
    expect(assign).not.toHaveBeenCalled();
  });

  it('preserves the recipient, words and checkbox on failure and prevents double submission', async () => {
    vi.spyOn(httpAdminExerciseDriver, 'getUsers').mockResolvedValue([recipient]);
    vi.spyOn(httpAdminExerciseDriver, 'searchWords').mockResolvedValue(page);
    let rejectAssignment!: (cause: Error) => void;
    const assign = vi.spyOn(httpAdminExerciseDriver, 'assign').mockImplementation(() => new Promise((_resolve, reject) => { rejectAssignment = reject; }));
    const router = await openForm();
    await selectRecipientAndWords();
    await wrapper!.get('form').trigger('submit');
    await wrapper!.get('form').trigger('submit');
    expect(assign).toHaveBeenCalledTimes(1);
    rejectAssignment(new Error('Не удалось создать задание'));
    await flushPromises();
    expect(wrapper!.text()).toContain('Не удалось создать задание');
    expect(autocompletes()[0]!.props('modelValue')).toEqual(recipient);
    expect(wrapper!.findComponent(IChipWord).props('word')).toBe('good morning');
    expect(router.currentRoute.value.path).toBe('/statistics/daily/new');
  });

  it('never loads recipient data or editing controls for ordinary users', async () => {
    const users = vi.spyOn(httpAdminExerciseDriver, 'getUsers');
    const searchWords = vi.spyOn(httpAdminExerciseDriver, 'searchWords');
    await openForm('user');
    expect(users).not.toHaveBeenCalled();
    expect(searchWords).not.toHaveBeenCalled();
    expect(wrapper!.find('form').exists()).toBe(false);
  });
});
