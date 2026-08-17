import {Capacitor} from '@capacitor/core';
import {SecureStorage} from '@aparajita/capacitor-secure-storage';
import type {TokenPair} from '@/api/types/auth';

type PersistedSession = {
  accessToken: string
  refreshToken: string
  userId: string
  lastOnlineAt: string
  refreshExpiresAt: string
}

const accessTokenKey = 'en-learning:access-token';
const refreshTokenKey = 'en-learning:refresh-token';
const userIdKey = 'en-learning:user-id';
const lastOnlineAtKey = 'en-learning:last-online-at';
const refreshExpiresAtKey = 'en-learning:refresh-expires-at';
const nativeSessionKey = 'authenticated-session';
const offlineSessionTtlMs = 14 * 24 * 60 * 60 * 1000;
const defaultRefreshTtlMs = 30 * 24 * 60 * 60 * 1000;

let session: PersistedSession | null = null;
let initialization: Promise<void> | null = null;
let isInitialized = false;

const getSessionValue = (key: string): string => {
  try {
    return sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const readWebSession = (): PersistedSession | null => {
  const accessToken = getSessionValue(accessTokenKey);
  const refreshToken = getSessionValue(refreshTokenKey);
  const userId = getSessionValue(userIdKey);

  if (!accessToken && !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    userId,
    lastOnlineAt: getSessionValue(lastOnlineAtKey),
    refreshExpiresAt: getSessionValue(refreshExpiresAtKey),
  };
};

const isPersistedSession = (value: unknown): value is PersistedSession => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PersistedSession>;

  return typeof candidate.accessToken === 'string'
    && typeof candidate.refreshToken === 'string'
    && typeof candidate.userId === 'string'
    && typeof candidate.lastOnlineAt === 'string'
    && typeof candidate.refreshExpiresAt === 'string';
};

const persistWebSession = (value: PersistedSession): void => {
  sessionStorage.setItem(accessTokenKey, value.accessToken);
  sessionStorage.setItem(refreshTokenKey, value.refreshToken);
  sessionStorage.setItem(userIdKey, value.userId);
  sessionStorage.setItem(lastOnlineAtKey, value.lastOnlineAt);
  sessionStorage.setItem(refreshExpiresAtKey, value.refreshExpiresAt);
};

const persist = async (): Promise<void> => {
  if (!session) {
    return;
  }

  if (Capacitor.isNativePlatform()) {
    await SecureStorage.set(nativeSessionKey, session);
    return;
  }

  persistWebSession(session);
};

const initialize = async (): Promise<void> => {
  if (isInitialized) {
    return;
  }

  initialization ??= (async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const stored = await SecureStorage.get(nativeSessionKey);
        session = isPersistedSession(stored) ? stored : null;
      } else {
        session = readWebSession();
      }
    } finally {
      isInitialized = true;
      initialization = null;
    }
  })();

  return initialization;
};

const save = async (tokens: TokenPair): Promise<void> => {
  const now = new Date();
  const refreshTtlMs = tokens.refreshExpiresIn
    ? tokens.refreshExpiresIn * 1000
    : defaultRefreshTtlMs;

  session = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: tokens.userId ?? session?.userId ?? '',
    lastOnlineAt: now.toISOString(),
    refreshExpiresAt: new Date(now.getTime() + refreshTtlMs).toISOString(),
  };
  isInitialized = true;
  await persist();
};

const markOnline = async (): Promise<void> => {
  if (!session) {
    return;
  }

  session.lastOnlineAt = new Date().toISOString();
  await persist();
};

const clear = async (): Promise<void> => {
  session = null;
  isInitialized = true;

  if (Capacitor.isNativePlatform()) {
    await SecureStorage.remove(nativeSessionKey);
    return;
  }

  for (const key of [
    accessTokenKey,
    refreshTokenKey,
    userIdKey,
    lastOnlineAtKey,
    refreshExpiresAtKey,
  ]) {
    sessionStorage.removeItem(key);
  }
};

const isOfflineSessionValid = (): boolean => {
  if (!session?.lastOnlineAt || !session.refreshExpiresAt) {
    return false;
  }

  const now = Date.now();
  const offlineExpiresAt = new Date(session.lastOnlineAt).getTime()
    + offlineSessionTtlMs;

  return now <= offlineExpiresAt
    && now <= new Date(session.refreshExpiresAt).getTime();
};

export const tokenStorage = {
  initialize,
  getAccessToken: (): string => session?.accessToken ?? '',
  getRefreshToken: (): string => session?.refreshToken ?? '',
  getUserId: (): string => session?.userId ?? '',
  isOfflineSessionValid,
  save,
  markOnline,
  clear,
};
