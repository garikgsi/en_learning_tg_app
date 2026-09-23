import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {createVuetify} from 'vuetify';
import {VApp} from 'vuetify/components';
import {h} from 'vue';
import IAdminUsers from '@/components/IAdminUsers.vue';
import {httpAdminExerciseDriver} from '@/api/http/adminExercise';
import type {AssignmentUser} from '@/api/http/adminExercise';
import {useUserStore} from '@/stores/userStore';

let wrapper: ReturnType<typeof mount> | null = null;

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: vi.fn().mockImplementation(media => ({
    matches: false, media, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  }))});
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.restoreAllMocks();
});

const open = async (role: 'admin' | 'user') => {
  const pinia = createPinia();
  setActivePinia(pinia);
  useUserStore().user = {
    id: 'current', name: 'Admin', phone: '+79990000000', role, avatar: '', createdAt: '2026-09-21T00:00:00Z',
  };
  wrapper = mount(VApp, {
    slots: {default: () => h(IAdminUsers)},
    global: {plugins: [pinia, createVuetify()]},
  });
  await flushPromises();
};

describe('admin users', () => {
  it('shows a skeleton while the user list is loading', async () => {
    vi.spyOn(httpAdminExerciseDriver, 'getUsers').mockReturnValue(
      new Promise<AssignmentUser[]>(() => undefined),
    );

    await open('admin');

    expect(wrapper!.find('[data-testid="users-skeleton"]').exists()).toBe(true);
    expect(wrapper!.findComponent({name: 'VSkeletonLoader'}).exists()).toBe(true);
  });

  it('shows phone, grade and current coin balance', async () => {
    vi.spyOn(httpAdminExerciseDriver, 'getUsers').mockResolvedValue([
      {id: '1', name: 'Анна', phone: '+79990000001', grade: 5, avatar: '/storage/avatars/anna.webp', balance: 12},
      {id: '2', name: 'Борис', phone: '+79990000002', grade: null, avatar: '', balance: 0},
    ]);

    await open('admin');

    expect(wrapper!.findAllComponents({name: 'VListItem'})).toHaveLength(2);
    expect(wrapper!.find('table').exists()).toBe(false);
    expect(wrapper!.text()).not.toContain('Логин');
    expect(wrapper!.text()).not.toContain('Номер телефона');
    expect(wrapper!.text()).toContain('Баланс: 12 EnCoin');
    expect(wrapper!.text()).toContain('5 класс');
    expect(wrapper!.text()).toContain('Анна');
    expect(wrapper!.text()).toContain('+79990000001');
    expect(wrapper!.findAllComponents({name: 'VAvatar'})).toHaveLength(2);
    expect(wrapper!.findAllComponents({name: 'VImg'})).toHaveLength(1);
    expect(wrapper!.findAllComponents({name: 'VBadge'}).map(badge => badge.props('content'))).toEqual([
      '5 класс',
      'Баланс: 12 EnCoin',
      'Класс не указан',
      'Баланс: 0 EnCoin',
    ]);
  });

  it('does not request or expose user data to an ordinary user', async () => {
    const getUsers = vi.spyOn(httpAdminExerciseDriver, 'getUsers');

    await open('user');

    expect(getUsers).not.toHaveBeenCalled();
    expect(wrapper!.text()).toContain('Страница доступна только администраторам.');
    expect(wrapper!.find('table').exists()).toBe(false);
  });
});
