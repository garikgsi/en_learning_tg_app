import {ref} from 'vue';
import {defineStore} from 'pinia';
import {httpEnCoinDriver} from '@/api/http/encoin';
import {useUserStore} from '@/stores/userStore';
import {useNetwork} from '@/use/network';

export const useMonetizationStore = defineStore('monetization', () => {
  const pendingCount = ref(0);
  const userStore = useUserStore();
  const {isConnected} = useNetwork();
  let sequence = 0;

  const reset = () => { sequence++; pendingCount.value = 0; };
  const synchronize = async (): Promise<void> => {
    if (!userStore.isAdmin || !userStore.user) { reset(); return; }
    if (!isConnected.value) return;
    const userId = userStore.user.id;
    const current = ++sequence;
    const response = await httpEnCoinDriver.getRequests('pending', 1);
    if (current === sequence && userStore.isAdmin && userStore.user?.id === userId) {
      pendingCount.value = response.total;
    }
  };

  return {pendingCount, synchronize, reset};
});
