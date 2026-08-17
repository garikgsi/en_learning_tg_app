import {ref, computed, type Ref} from "vue";
import type {
  Message,
  MessageOptions,
  MessageType,
} from '@/use/types/messages';

const messages:Ref<Message[]> = ref([]);
let nextMessageId = 1;

export default function useMessages() {

  const addMessage  = (text: string,
                       type: MessageType,
                       timeout: number,
                       options: MessageOptions = {}):Message => {
    const existing = options.key
      ? messages.value.find(message => message.key === options.key)
      : undefined;

    if (existing) {
      existing.revision++;
      existing.text = text;
      existing.type = type;
      existing.timeout = timeout;
      existing.action = options.action;
      existing.isActive = true;

      return existing;
    }

    const newMessage = {
      id: nextMessageId++,
      revision: 0,
      text,
      type,
      isActive: true,
      timeout,
      ...options,
    }

    messages.value.push(newMessage);

    return newMessage;

  }

  const addError = (
    text: string,
    timeout = 0,
    options: MessageOptions = {},
  ): Message => {
    return addMessage(text, 'error', timeout, options);
  }

  const add = (text:string, timeout: number = 5):Message => {
    return addMessage(text, 'success', timeout);
  }

  const addInfo = (text:string, timeout: number = 5):Message => {
    return addMessage(text, 'info', timeout);
  }

  const addWarning = (
    text: string,
    timeout = 0,
    options: MessageOptions = {},
  ): Message => {
    return addMessage(text, 'warning', timeout, options);
  }

  const readMessage = (id: number) => {
    messages.value = messages.value.map(m => {
      if (m.id === id) {
        m.isActive = false
      }
      return m;
    })
  }

  const readAllMessages = () => {
    messages.value = messages.value.map(m => {
      m.isActive = false;
      return m;
    })
  }

  const readMessageByKey = (key: string) => {
    messages.value = messages.value.map(message => {
      if (message.key === key) {
        message.isActive = false;
      }

      return message;
    });
  }

  const unreadMessages = computed(() => messages.value.filter(m => m.isActive === true));

  const unreadMessagesCount = computed(() => unreadMessages.value.length);

  const hasMessage = computed(() => unreadMessagesCount.value > 0);

  const lastUnreadMessage = computed(() => unreadMessagesCount.value > 0 ? unreadMessages.value[0]: null);

  return {
    addMessage,
    addError,
    addInfo,
    addWarning,
    add,
    readAllMessages,
    readMessage,
    readMessageByKey,
    messages: unreadMessages,
    count: unreadMessagesCount,
    hasMessage,
    last: lastUnreadMessage
  };
}
