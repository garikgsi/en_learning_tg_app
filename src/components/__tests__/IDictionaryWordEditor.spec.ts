import {mount, flushPromises} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {createRouter, createMemoryHistory, RouterView} from 'vue-router';
import {createVuetify} from 'vuetify';
import {VApp} from 'vuetify/components';
import {h} from 'vue';
import IDictionaryWordEditor from '@/components/IDictionaryWordEditor.vue';
import {httpDictionaryDriver} from '@/api/http/dictionary';
import {useUserStore} from '@/stores/userStore';
import type {ApiDictionaryWord} from '@/api/types/dictionary';

const word: ApiDictionaryWord = {
  id: 42, en: 'home', ru: 'дом', enVariants: ['house'], ruVariants: [],
  transcription: '/həʊm/', grade: 3, createdAt: '2026-09-18T00:00:00Z',
  repeatCount: 2, successfulRepeatCount: 2, failedRepeatCount: 0, is_active: false,
};
let wrapper: ReturnType<typeof mount> | null = null;
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: vi.fn().mockImplementation(media => ({
    matches: false, media, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  }))});
});
afterEach(() => { wrapper?.unmount(); wrapper = null; vi.restoreAllMocks(); });

const openEditor = async (role: 'admin' | 'user' = 'admin') => {
  const pinia = createPinia();
  setActivePinia(pinia);
  useUserStore().user = {id: 'editor-test-user', name: 'Admin', phone: '+79990000000', role, avatar: '', createdAt: word.createdAt};
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {path: '/dictionary', component: {template: '<p>Словарь</p>'}},
      {path: '/dictionary/words/:wordId/edit', component: IDictionaryWordEditor, props: true},
    ],
  });
  await router.push('/dictionary/words/42/edit');
  await router.isReady();
  wrapper = mount(VApp, {
    attachTo: document.body,
    slots: {default: () => h(RouterView)},
    global: {plugins: [pinia, createVuetify(), router]},
  });
  await flushPromises();
  return router;
};

describe('admin dictionary word editor', () => {
  it('adds a variant, previews it and sends existing values and variants on save', async () => {
    vi.spyOn(httpDictionaryDriver, 'getWord').mockResolvedValue({item: word});
    const update = vi.spyOn(httpDictionaryDriver, 'updateWord').mockResolvedValue({item: {...word, enVariants: ['house', 'dwelling']}});
    const router = await openEditor();
    expect(wrapper!.text()).toContain('/həʊm/');
    expect(wrapper!.findAllComponents({name: 'VTextField'}).some(field => field.props('label') === 'Транскрипция')).toBe(false);
    const variants = wrapper!.findAllComponents({name: 'VCombobox'}).find(field => field.props('label') === 'Варианты на английском')!;
    await variants.get('input').setValue('dwelling');
    await variants.get('input').trigger('keydown', {key: 'Enter'});
    await flushPromises();
    expect(variants.findAllComponents({name: 'VChip'}).map(chip => chip.text())).toEqual(['house', 'dwelling']);
    expect(wrapper!.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper!.get('.word-editor__preview[lang="en"]').text()).toBe('home; house; dwelling');
    await wrapper!.get('form').trigger('submit');
    await flushPromises();
    expect(update).toHaveBeenCalledWith(42, {
      english: 'home', russian: 'дом', englishVariants: ['house', 'dwelling'], russianVariants: [],
    });
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/dictionary'));
  });

  it('keeps the form and draft when saving fails', async () => {
    vi.spyOn(httpDictionaryDriver, 'getWord').mockResolvedValue({item: word});
    vi.spyOn(httpDictionaryDriver, 'updateWord').mockRejectedValue(new Error('Сохранение недоступно'));
    const router = await openEditor();
    await wrapper!.findAll('input')[0]!.setValue('dwelling');
    await wrapper!.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper!.text()).toContain('Сохранение недоступно');
    expect(wrapper!.findAll('input')[0]!.element.value).toBe('dwelling');
    expect(router.currentRoute.value.path).toBe('/dictionary/words/42/edit');
  });

  it('removes a chip and preserves a pending multiword variant on save', async () => {
    vi.spyOn(httpDictionaryDriver, 'getWord').mockResolvedValue({item: word});
    const update = vi.spyOn(httpDictionaryDriver, 'updateWord').mockResolvedValue({item: word});
    await openEditor();
    const variants = wrapper!.findAllComponents({name: 'VCombobox'})[0]!;
    await variants.findComponent({name: 'VChip'}).get('.v-chip__close').trigger('click');
    await variants.get('input').setValue('family home');
    await wrapper!.get('form').trigger('submit');
    await flushPromises();
    expect(update).toHaveBeenCalledWith(42, {english: 'home', russian: 'дом', englishVariants: ['family home'], russianVariants: []});
  });

  it('rejects variants duplicating the primary word without losing the input', async () => {
    vi.spyOn(httpDictionaryDriver, 'getWord').mockResolvedValue({item: word});
    const update = vi.spyOn(httpDictionaryDriver, 'updateWord');
    await openEditor();
    const variants = wrapper!.findAllComponents({name: 'VCombobox'})[0]!;
    await variants.get('input').setValue('HOME');
    await variants.get('input').trigger('keydown', {key: 'Enter'});
    await wrapper!.get('form').trigger('submit');
    await flushPromises();
    expect(update).not.toHaveBeenCalled();
    expect(wrapper!.text()).toContain('Такое значение уже есть');
  });

  it('does not load or show editing controls for an ordinary user', async () => {
    const getWord = vi.spyOn(httpDictionaryDriver, 'getWord');
    await openEditor('user');
    expect(getWord).not.toHaveBeenCalled();
    expect(wrapper!.find('form').exists()).toBe(false);
    expect(wrapper!.text()).toContain('только администраторам');
  });
});
