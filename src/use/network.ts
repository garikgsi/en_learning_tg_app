import {readonly, ref} from 'vue';
import type {PluginListenerHandle} from '@capacitor/core';
import {Network} from '@capacitor/network';

const isConnected = ref(true);
const isInitialized = ref(false);
let initialization: Promise<void> | null = null;
let listener: PluginListenerHandle | null = null;

const initialize = async (): Promise<void> => {
  if (isInitialized.value) {
    return;
  }

  if (initialization) {
    return initialization;
  }

  initialization = (async () => {
    try {
      const status = await Network.getStatus();
      isConnected.value = status.connected;
      listener = await Network.addListener('networkStatusChange', value => {
        isConnected.value = value.connected;
      });
    } catch {
      isConnected.value = navigator.onLine;
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    } finally {
      isInitialized.value = true;
      initialization = null;
    }
  })();

  return initialization;
};

const handleOnline = (): void => {
  isConnected.value = true;
};

const handleOffline = (): void => {
  isConnected.value = false;
};

const dispose = async (): Promise<void> => {
  await listener?.remove();
  listener = null;
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  isInitialized.value = false;
};

export const useNetwork = () => ({
  isConnected: readonly(isConnected),
  isInitialized: readonly(isInitialized),
  initialize,
  dispose,
});
