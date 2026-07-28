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

  return validationMessage
    ?? error.response?.data?.message
    ?? fallback;
}
