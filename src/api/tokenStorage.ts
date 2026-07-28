export type TokenPair = {
  accessToken: string
  refreshToken: string
}

const accessTokenKey = 'en-learning:access-token';
const refreshTokenKey = 'en-learning:refresh-token';

const getSessionValue = (key: string): string => {
  try {
    return sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

let accessToken = getSessionValue(accessTokenKey);
let refreshToken = getSessionValue(refreshTokenKey);

export const tokenStorage = {
  getAccessToken: (): string => accessToken,
  getRefreshToken: (): string => refreshToken,
  save: (tokens: TokenPair): void => {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;

    try {
      sessionStorage.setItem(accessTokenKey, tokens.accessToken);
      sessionStorage.setItem(refreshTokenKey, tokens.refreshToken);
    } catch {
      // In-memory tokens keep the current session usable without Web Storage.
    }
  },
  clear: (): void => {
    accessToken = '';
    refreshToken = '';

    try {
      sessionStorage.removeItem(accessTokenKey);
      sessionStorage.removeItem(refreshTokenKey);
    } catch {
      // There is nothing else to clear when Web Storage is unavailable.
    }
  },
};
