import {http} from '@/api/http';
import type {AuthResponse} from '@/api/types/auth';

export const httpAuthDriver = {
  login(phone: string, pinCode: string): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/login', {phone, pinCode});
  },

  register(data: FormData): Promise<AuthResponse> {
    return http.post<AuthResponse>('/auth/register', data);
  },

  logout(): Promise<void> {
    return http.post<void>('/auth/logout');
  },
};
