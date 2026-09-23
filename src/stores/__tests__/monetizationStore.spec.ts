import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {useMonetizationStore} from '@/stores/monetizationStore';
import {useUserStore} from '@/stores/userStore';
import {httpEnCoinDriver} from '@/api/http/encoin';
import {routes} from '@/router/routeAccess';
import type {MonetizationPage} from '@/api/types/encoin';

beforeEach(() => {
  setActivePinia(createPinia());
  useUserStore().user = {id: 'admin', name: 'Admin', phone: '+79990000000', role: 'admin', avatar: '', createdAt: '2026-09-18T00:00:00Z'};
});
afterEach(() => vi.restoreAllMocks());

describe('monetization menu count', () => {
  it('places the admin item immediately below balance and counts pending requests across pages', async () => {
    const get = vi.spyOn(httpEnCoinDriver, 'getRequests').mockResolvedValue({items: [], page: 1, lastPage: 3, total: 65});
    const store = useMonetizationStore();
    await store.synchronize();
    expect(Object.keys(routes).filter(path => routes[path]!.showInSideBar).slice(0, 3)).toEqual([
      '/balance',
      '/achievements',
      '/monetization-requests',
    ]);
    expect(get).toHaveBeenCalledWith('pending', 1);
    expect(store.pendingCount).toBe(65);
    get.mockResolvedValue({items: [], page: 1, lastPage: 1, total: 0});
    await store.synchronize();
    expect(store.pendingCount).toBe(0);
  });

  it('does not fetch admin data for an ordinary user and clears the old count', async () => {
    const get = vi.spyOn(httpEnCoinDriver, 'getRequests');
    const store = useMonetizationStore();
    store.pendingCount = 8;
    useUserStore().user!.role = 'user';
    await store.synchronize();
    expect(get).not.toHaveBeenCalled();
    expect(store.pendingCount).toBe(0);
  });

  it('ignores a delayed response after the administrator logs out', async () => {
    let resolve!: (page: MonetizationPage) => void;
    vi.spyOn(httpEnCoinDriver, 'getRequests').mockReturnValue(new Promise<MonetizationPage>(done => { resolve = done; }));
    const store = useMonetizationStore();
    const pending = store.synchronize();
    useUserStore().user = null;
    store.reset();
    resolve({items: [], page: 1, lastPage: 1, total: 5});
    await pending;
    expect(store.pendingCount).toBe(0);
  });
});
