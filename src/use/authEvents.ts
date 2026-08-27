type AccessTokenRefreshedListener = () => void;

const accessTokenRefreshedListeners = new Set<AccessTokenRefreshedListener>();

export const emitAccessTokenRefreshed = (): void => {
  for (const listener of accessTokenRefreshedListeners) {
    listener();
  }
};

export const onAccessTokenRefreshed = (
  listener: AccessTokenRefreshedListener,
): (() => void) => {
  accessTokenRefreshedListeners.add(listener);

  return () => accessTokenRefreshedListeners.delete(listener);
};
