import {http} from '@/api/http';
import type {
  NotificationSyncResponse,
  UserNotification,
} from '@/api/types/notification';

type RegisterDevicePayload = {
  installationId: string
  pushToken: string
  platform: 'android' | 'ios'
  notificationsEnabled: boolean
}

export const httpNotificationDriver = {
  synchronize(
    afterSequence: number,
    perPage = 100,
  ): Promise<NotificationSyncResponse> {
    return http.get<NotificationSyncResponse>('/notifications', {
      params: {afterSequence, perPage},
    });
  },

  markRead(notificationId: string): Promise<UserNotification> {
    return http.patch<UserNotification>(
      `/notifications/${notificationId}/read`,
    );
  },

  markAllRead(): Promise<{readAt: string, unreadCount: number}> {
    return http.patch('/notifications/read');
  },

  registerDevice(payload: RegisterDevicePayload): Promise<void> {
    return http.put<void>('/notification-devices', payload);
  },

  removeDevice(installationId: string): Promise<void> {
    return http.delete<void>(`/notification-devices/${installationId}`);
  },
};
