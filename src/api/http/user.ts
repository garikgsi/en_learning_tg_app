import {http} from '@/api/http';
import type {UserInfo} from '@/api/types/user';

type UserResponse = {
  data: UserInfo
}

export const httpUserDriver = {
  async getCurrent(): Promise<UserInfo> {
    const response = await http.get<UserResponse>('/users/me');

    return response.data;
  },

  async updateName(name: string): Promise<UserInfo> {
    const response = await http.patch<UserResponse>('/users/me', {
      name,
    });

    return response.data;
  },

  async updateMultipart(data: FormData): Promise<UserInfo> {
    const response = await http.post<UserResponse>('/users/me', data);

    return response.data;
  },

  updatePin(data: {
    currentPin: string
    pinCode: string
    pinCodeConfirmation: string
  }): Promise<void> {
    return http.put<void>('/users/me/pin', data);
  },
};
