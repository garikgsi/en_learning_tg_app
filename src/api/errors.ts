import axios from 'axios';

type ApiErrorBody = {
  message?: string
  code?: string
  errors?: Record<string, string[]>
}

export const isNetworkError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && !error.response;
};

export const getApiErrorStatus = (error: unknown): number | null => {
  return axios.isAxiosError(error) ? error.response?.status ?? null : null;
};

export const getApiErrorCode = (error: unknown): string | null => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return null;
  }

  return error.response?.data?.code ?? null;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const errors = error.response?.data?.errors;
  const validationMessage = errors
    ? Object.values(errors).flat().find(Boolean)
    : undefined;

  if (error.response?.status === 413) {
    return 'Размер файла превышает допустимые 10 МБ';
  }

  if (!error.response) {
    return 'Нет соединения с сервером. Проверьте интернет и повторите попытку';
  }

  if (error.response.status >= 500) {
    return 'Ошибка сервера. Повторите попытку позже';
  }

  return validationMessage
    ?? error.response?.data?.message
    ?? fallback;
}
