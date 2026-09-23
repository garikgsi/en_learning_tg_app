export type UserRole = 'admin' | 'user'

export type UserInfo = {
  id: string
  name: string
  phone: string
  role: UserRole
  avatar: string
  grade?: number | null
  createdAt: string
}
