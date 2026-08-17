import type {UserInfo} from '@/api/types/user';

export type TokenPair = {
  accessToken: string
  refreshToken: string
  userId?: string
  refreshExpiresIn?: number
}

export type AuthResponse = TokenPair & {
  user: UserInfo
  tokenType: 'Bearer'
  expiresIn: number
  refreshExpiresIn: number
}
