import {httpAuthDriver} from '@/api/http/auth';

export const useAuthRepository = () => ({
  login: httpAuthDriver.login,
  register: httpAuthDriver.register,
  logout: httpAuthDriver.logout,
});
