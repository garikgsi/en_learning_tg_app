import {http} from '@/api/http';
import type {AppRelease} from '@/api/types/appUpdate';

type LatestAppReleaseResponse = {
  data: AppRelease | null
}

export const httpAppUpdateDriver = {
  async getLatest(): Promise<AppRelease | null> {
    const response = await http.get<LatestAppReleaseResponse>(
      '/app-updates/latest',
    );

    return response.data;
  },
};
