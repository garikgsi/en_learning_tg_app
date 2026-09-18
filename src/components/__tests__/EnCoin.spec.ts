import {mount, flushPromises} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {createRouter, createMemoryHistory} from 'vue-router';
import {createVuetify} from 'vuetify';
import {VApp} from 'vuetify/components';
import {h, type Component} from 'vue';
import BalancePage from '@/pages/balance.vue';
import ProfilePage from '@/pages/profile.vue';
import IMonetizationRequests from '@/components/IMonetizationRequests.vue';
import {httpEnCoinDriver} from '@/api/http/encoin';
import {useUserStore} from '@/stores/userStore';
import {formatRubles} from '@/use/encoin';
import type {AdminMonetizationRequest, EnCoinBalance} from '@/api/types/encoin';

const balance: EnCoinBalance = {balance: 60, reserved: 0, available: 60, rublesPerCoin: 10, withdrawalThreshold: 50, totalEarnedCoins: 80, totalEarnedRubles: 800, requests: []};
const request: AdminMonetizationRequest = {id: 42, coins: 50, rublesPerCoin: 10, amountRubles: 500, createdAt: '2026-09-18T10:00:00Z', processedAt: null, isProcessed: false, user: {id: 'recipient', name: 'Анна', phone: '+79990000001', balance: 70, reserved: 50}};
const page = {items: [request], page: 1, lastPage: 1, total: 1};
let wrapper: ReturnType<typeof mount> | null = null;
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: vi.fn().mockImplementation(media => ({
    matches: false, media, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  }))});
});
afterEach(() => { wrapper?.unmount(); wrapper = null; vi.restoreAllMocks(); });

const open = async (component: Component, role: 'admin' | 'user' = 'admin') => {
  const pinia = createPinia();
  setActivePinia(pinia);
  useUserStore().user = {id: 'encoin-test', name: 'Пользователь', phone: '+79990000000', role, avatar: '', createdAt: request.createdAt};
  const router = createRouter({history: createMemoryHistory(), routes: [{path: '/', component: {render: () => h('div')}}]});
  await router.push('/');
  await router.isReady();
  wrapper = mount(VApp, {attachTo: document.body, slots: {default: () => h(component)}, global: {plugins: [pinia, createVuetify(), router]}});
  await flushPromises();
};
const button = (text: string) => wrapper!.findAll('button').find(button => button.text().includes(text))!;
const field = (label: string) => wrapper!.findAllComponents({name: 'VTextField'}).find(field => field.props('label') === label)!;

describe('EnCoin interface', () => {
  it('invites a user with zero lifetime earnings to exercises in the green block', async () => {
    vi.spyOn(httpEnCoinDriver, 'getBalance').mockResolvedValue({...balance, balance: 0, available: 0, totalEarnedCoins: 0, totalEarnedRubles: 0});
    await open(BalancePage, 'user');
    expect(wrapper!.text()).toContain('Начните зарабатывать деньги просто проходя упражнения');
    expect(wrapper!.get('.encoin-balance__start a').attributes('href')).toBe('/exercises');
    expect(wrapper!.get('.encoin-balance__start').element.closest('.v-card')!.classList.contains('text-success')).toBe(true);
  });
  it('limits typed and pasted withdrawal amounts to available coins including reservations', async () => {
    vi.spyOn(httpEnCoinDriver, 'getBalance').mockResolvedValue({...balance, balance: 80, reserved: 20});
    const withdraw = vi.spyOn(httpEnCoinDriver, 'withdraw').mockResolvedValue({item: request});
    await open(BalancePage, 'user');
    await button('Вывести').trigger('click');
    await flushPromises();
    const input = field('Количество монет').get('input');
    await input.setValue('70');
    await flushPromises();
    expect((input.element as HTMLInputElement).value).toBe('60');
    await input.setValue('999999999999999999999999999999');
    await flushPromises();
    expect((input.element as HTMLInputElement).value).toBe('60');
    await wrapper!.findComponent({name: 'VForm'}).trigger('submit');
    await flushPromises();
    expect(withdraw).toHaveBeenCalledWith(60, expect.any(String));
  });

  it('shows a balance below 50 with an unavailable withdrawal and the threshold explanation', async () => {
    vi.spyOn(httpEnCoinDriver, 'getBalance').mockResolvedValue({...balance, balance: 32, available: 32});
    await open(BalancePage, 'user');
    expect(wrapper!.text()).toContain('32 EnCoin');
    expect(wrapper!.text()).toContain(formatRubles(320));
    expect(button('Вывести').attributes('disabled')).toBeDefined();
    expect(wrapper!.text()).toContain('Вывод доступен при доступном балансе от 50 EnCoin.');
  });

  it('shows balance and rate and prevents withdrawal of reserved coins', async () => {
    vi.spyOn(httpEnCoinDriver, 'getBalance').mockResolvedValue({...balance, reserved: 50, available: 10});
    const withdraw = vi.spyOn(httpEnCoinDriver, 'withdraw');
    await open(BalancePage, 'user');
    expect(wrapper!.text()).toContain('60 EnCoin');
    expect(wrapper!.text()).toContain(formatRubles(600));
    expect(button('Вывести').attributes('disabled')).toBeDefined();
    expect(withdraw).not.toHaveBeenCalled();
  });

  it('uses the same request id on retry and refreshes reservations after successful withdrawal', async () => {
    const getBalance = vi.spyOn(httpEnCoinDriver, 'getBalance').mockResolvedValueOnce(balance)
      .mockResolvedValue({...balance, reserved: 50, available: 10, requests: [request]});
    const withdraw = vi.spyOn(httpEnCoinDriver, 'withdraw').mockRejectedValueOnce(new Error('Нет ответа от сервера')).mockResolvedValue({item: request});
    await open(BalancePage, 'user');
    await button('Вывести').trigger('click');
    await flushPromises();
    await field('Количество монет').get('input').setValue('50');
    const form = wrapper!.findComponent({name: 'VForm'});
    await form.trigger('submit');
    await flushPromises();
    expect(form.text()).toContain('Нет ответа от сервера');
    const firstId = withdraw.mock.calls[0]![1];
    await form.trigger('submit');
    await flushPromises();
    expect(withdraw).toHaveBeenNthCalledWith(2, 50, firstId);
    expect(getBalance).toHaveBeenCalledTimes(2);
    expect(wrapper!.text()).toContain('В заявках на вывод50 EnCoin');
    expect(button('Вывести').attributes('disabled')).toBeDefined();
  });

  it('displays lifetime coins and rubles on balance independently of withdrawals and the current rate', async () => {
    vi.spyOn(httpEnCoinDriver, 'getBalance').mockResolvedValue({...balance, balance: 0, available: 0, rublesPerCoin: 12.5, totalEarnedCoins: 62, totalEarnedRubles: 625});
    await open(BalancePage, 'user');
    expect(wrapper!.text()).toContain('Заработано за всё время');
    expect(wrapper!.text()).toContain('62 EnCoin');
    expect(wrapper!.text()).toContain(formatRubles(625));
  });

  it('does not show lifetime earnings or load balance on the profile', async () => {
    const getBalance = vi.spyOn(httpEnCoinDriver, 'getBalance');
    await open(ProfilePage, 'user');
    expect(wrapper!.text()).not.toContain('Заработано за всё время');
    expect(getBalance).not.toHaveBeenCalled();
  });

  it('lets admins change the rate without changing an existing request amount', async () => {
    vi.spyOn(httpEnCoinDriver, 'getRequests').mockResolvedValue(page);
    vi.spyOn(httpEnCoinDriver, 'getRate').mockResolvedValue({rublesPerCoin: 10});
    const updateRate = vi.spyOn(httpEnCoinDriver, 'updateRate').mockResolvedValue({rublesPerCoin: 12.5});
    await open(IMonetizationRequests);
    await field('Рублей за 1 EnCoin').get('input').setValue('12.50');
    await wrapper!.findComponent({name: 'VForm'}).trigger('submit');
    await flushPromises();
    expect(updateRate).toHaveBeenCalledWith('12.50');
    expect(wrapper!.text()).toContain(formatRubles(12.5));
    expect(wrapper!.text()).toContain(formatRubles(500));
  });

  it('marks a request processed and displays the updated balance and date', async () => {
    const processed = {...request, isProcessed: true, processedAt: request.createdAt, user: {...request.user, balance: 20, reserved: 0}};
    vi.spyOn(httpEnCoinDriver, 'getRequests').mockResolvedValueOnce(page).mockResolvedValue({...page, items: [processed]});
    vi.spyOn(httpEnCoinDriver, 'getRate').mockResolvedValue({rublesPerCoin: 10});
    const process = vi.spyOn(httpEnCoinDriver, 'process').mockResolvedValue({item: processed});
    await open(IMonetizationRequests);
    await button('Отметить обработанным').trigger('click');
    await flushPromises();
    expect(process).toHaveBeenCalledWith(42);
    expect(wrapper!.text()).toContain('20 EnCoin');
    expect(button('Отметить обработанным')).toBeUndefined();
  });

  it('never exposes admin data or controls to ordinary users', async () => {
    const requests = vi.spyOn(httpEnCoinDriver, 'getRequests');
    const rate = vi.spyOn(httpEnCoinDriver, 'getRate');
    await open(IMonetizationRequests, 'user');
    expect(requests).not.toHaveBeenCalled();
    expect(rate).not.toHaveBeenCalled();
    expect(wrapper!.find('form').exists()).toBe(false);
    expect(wrapper!.text()).toContain('только администраторам');
  });
});
