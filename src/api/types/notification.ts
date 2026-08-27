export type UserNotification = {
  id: string
  sequence: number
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

export type NotificationSyncResponse = {
  items: UserNotification[]
  nextSequence: number
  hasMore: boolean
  unreadCount: number
}

export type CachedUserNotification = UserNotification & {
  key: string
  userId: string
}

export type NotificationSyncMetadata = {
  key: string
  userId: string
  nextSequence: number
  unreadCount: number
  synchronizedAt: string
}
