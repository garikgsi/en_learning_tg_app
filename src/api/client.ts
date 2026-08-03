import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import {tokenStorage, type TokenPair} from '@/api/tokenStorage';

import useLoading from '@/use/loading';

const {setLoading, isLoading} = useLoading();

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

type RefreshResponse = TokenPair;

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const defaultBaseUrl = import.meta.env.PROD ? '/' : 'http://localhost:8088';

export const apiBaseUrl = configuredBaseUrl || defaultBaseUrl;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
});

let refreshRequest: Promise<string> | null = null;

apiClient.interceptors.request.use(config => {

  setLoading(true);
  console.log('apiClient.interceptors.request', isLoading.value);


  const accessToken = tokenStorage.getAccessToken();

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log('apiClient.interceptors.response', isLoading.value);
    setLoading(false);

    return response;
  },

  async (error: AxiosError) => {
        const config = error.config as RetryableRequestConfig | undefined;
        const refreshToken = tokenStorage.getRefreshToken();
        const isAuthRequest = config?.url?.startsWith('/api/v1/auth/') ?? false;

        if (
          error.response?.status !== 401
          || !config
          || config._retry
          || !refreshToken
          || isAuthRequest
        ) {
          return Promise.reject(error);
        }

        config._retry = true;

        refreshRequest ??= refreshClient
          .post<RefreshResponse>('/api/v1/auth/refresh', {refreshToken})
          .then(({data}) => {
            tokenStorage.save(data);
            return data.accessToken;
          })
          .catch(refreshError => {
            tokenStorage.clear();
            throw refreshError;
          })
          .finally(() => {
            refreshRequest = null;
          });

        const accessToken = await refreshRequest;
        config.headers = AxiosHeaders.from(config.headers);
        config.headers.set('Authorization', `Bearer ${accessToken}`);

        setLoading(false);

        return apiClient.request(config);
  }
);
