import {Capacitor, type PluginListenerHandle} from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type Token,
} from '@capacitor/push-notifications';
import {httpNotificationDriver} from '@/api/http/notification';

const installationIdStorageKey = 'en-learning:installation-id';

let activeUserId: string | null = null;
let initialization: Promise<void> | null = null;
let isInitialized = false;
let listeners: PluginListenerHandle[] = [];
let synchronizeNotifications: (() => Promise<void>) | null = null;
let openRoute: ((route: string) => Promise<void>) | null = null;

const getInstallationId = (): string => {
  const existing = localStorage.getItem(installationIdStorageKey);

  if (existing) {
    return existing;
  }

  const installationId = crypto.randomUUID();
  localStorage.setItem(installationIdStorageKey, installationId);

  return installationId;
};

const getExistingInstallationId = (): string | null => {
  return localStorage.getItem(installationIdStorageKey);
};

const registerDevice = async (token: Token): Promise<void> => {
  if (!activeUserId) {
    return;
  }

  const platform = Capacitor.getPlatform();

  if (platform !== 'android' && platform !== 'ios') {
    return;
  }

  await httpNotificationDriver.registerDevice({
    installationId: getInstallationId(),
    pushToken: token.value,
    platform,
    notificationsEnabled: true,
  });
};

const handleAction = async (action: ActionPerformed): Promise<void> => {
  await synchronizeNotifications?.();
  const route = action.notification.data?.route;

  if (typeof route === 'string' && route.startsWith('/')) {
    await openRoute?.(route);
  }
};

const addListeners = async (): Promise<void> => {
  listeners = await Promise.all([
    PushNotifications.addListener('registration', token => {
      void registerDevice(token).catch(() => undefined);
    }),
    PushNotifications.addListener('pushNotificationReceived', () => {
      void synchronizeNotifications?.().catch(() => undefined);
    }),
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      action => {
        void handleAction(action).catch(() => undefined);
      },
    ),
  ]);
};

const initializeForUser = async (
  userId: string,
  onSynchronize: () => Promise<void>,
  onOpenRoute: (route: string) => Promise<void>,
): Promise<void> => {
  activeUserId = userId;
  synchronizeNotifications = onSynchronize;
  openRoute = onOpenRoute;

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (isInitialized) {
    return;
  }

  if (initialization) {
    return initialization;
  }

  initialization = (async () => {
    await addListeners();
    await PushNotifications.createChannel({
      id: 'exercises',
      name: 'Уведомления',
      description: 'Упражнения, напоминания и обновления приложения',
      importance: 4,
      vibration: true,
    });

    let permission = await PushNotifications.checkPermissions();

    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }
    isInitialized = true;
  })().finally(() => {
    initialization = null;
  });

  return initialization;
};

const dispose = async (): Promise<void> => {
  await Promise.all(listeners.map(listener => listener.remove()));
  listeners = [];
  isInitialized = false;
  activeUserId = null;
  synchronizeNotifications = null;
  openRoute = null;
};

const unregisterCurrentDevice = async (): Promise<void> => {
  const installationId = getExistingInstallationId();

  try {
    if (installationId) {
      await httpNotificationDriver.removeDevice(installationId);
    }
  } finally {
    if (Capacitor.isNativePlatform()) {
      await PushNotifications.unregister();
    }
  }

  activeUserId = null;
};

export const usePushNotifications = () => ({
  initializeForUser,
  unregisterCurrentDevice,
  dispose,
});
