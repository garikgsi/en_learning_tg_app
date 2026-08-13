import axios from 'axios';

type ApiErrorBody = {
  message?: string
  errors?: Record<string, string[]>
}

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

  return validationMessage
    ?? error.response?.data?.message
    ?? fallback;
}
