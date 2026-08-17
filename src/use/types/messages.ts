export type MessageType = 'success' | 'error' | 'info' | 'warning';

export type MessageAction = {
  title: string
  handler: () => void | Promise<void>
}

export type MessageOptions = {
  action?: MessageAction
  key?: string
}

export type Message = {
  id: number
  revision: number
  text: string
  type: MessageType
  isActive: boolean
  timeout: number
  action?: MessageAction
  key?: string
}
