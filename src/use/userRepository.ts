import {httpUserDriver} from '@/api/http/user';
import {indexedDbUserDriver} from '@/api/indexedDb/user';
import type {UserInfo} from '@/api/types/user';
import type {RepositoryResult} from '@/use/types/repository';
import {getRepositoryFallbackReason} from '@/use/repositoryFallback';

const repository = {
  async getCurrent(userId: string): Promise<RepositoryResult<UserInfo>> {
    try {
      const user = await httpUserDriver.getCurrent();
      await indexedDbUserDriver.save(user);

      return {data: user, source: 'http'};
    } catch (error) {
      const fallbackReason = getRepositoryFallbackReason(error);

      if (!fallbackReason) {
        throw error;
      }

      const user = await indexedDbUserDriver.get(userId);

      if (!user) {
        throw error;
      }

      return {data: user, source: 'indexedDb', fallbackReason};
    }
  },

  save(user: UserInfo): Promise<void> {
    return indexedDbUserDriver.save(user);
  },

  async updateName(name: string): Promise<UserInfo> {
    const user = await httpUserDriver.updateName(name);
    await indexedDbUserDriver.save(user);

    return user;
  },

  async updateMultipart(data: FormData): Promise<UserInfo> {
    const user = await httpUserDriver.updateMultipart(data);
    await indexedDbUserDriver.save(user);

    return user;
  },

  updatePin(data: {
    currentPin: string
    pinCode: string
    pinCodeConfirmation: string
  }): Promise<void> {
    return httpUserDriver.updatePin(data);
  },

  remove(userId: string): Promise<void> {
    return indexedDbUserDriver.remove(userId);
  },
};

export const useUserRepository = () => repository;
