import {apiClient} from '@/api/client';

export type HttpRequestOptions = {
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface HttpTransport {
  get<T>(url: string, options?: HttpRequestOptions): Promise<{data: T}>
  post<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<{data: T}>
  put<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<{data: T}>
  patch<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<{data: T}>
  delete<T>(url: string, options?: HttpRequestOptions): Promise<{data: T}>
}

export const baseUrl = '/api/v1';

export class HttpClient {
  constructor(
    private readonly transport: HttpTransport,
    private readonly baseUrl = '',
  ) {}

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async get<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    const response = options
      ? await this.transport.get<T>(this.url(url), options)
      : await this.transport.get<T>(this.url(url));

    return response.data;
  }

  async post<T>(
    url: string,
    data?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const response = options
      ? await this.transport.post<T>(this.url(url), data, options)
      : await this.transport.post<T>(this.url(url), data);

    return response.data;
  }

  async put<T>(
    url: string,
    data?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const response = options
      ? await this.transport.put<T>(this.url(url), data, options)
      : await this.transport.put<T>(this.url(url), data);

    return response.data;
  }

  async patch<T>(
    url: string,
    data?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
    const response = options
      ? await this.transport.patch<T>(this.url(url), data, options)
      : await this.transport.patch<T>(this.url(url), data);

    return response.data;
  }

  async delete<T>(url: string, options?: HttpRequestOptions): Promise<T> {
    const response = options
      ? await this.transport.delete<T>(this.url(url), options)
      : await this.transport.delete<T>(this.url(url));

    return response.data;
  }
}

export const http = new HttpClient(apiClient, baseUrl);
