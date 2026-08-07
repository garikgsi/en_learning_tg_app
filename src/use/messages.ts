import {ref, computed, type Ref} from "vue";

export type MessageType = 'success'|'error'|'info';

export type Message = {
  id: number,
  text: string,
  type: MessageType,
  isActive: Boolean,
  timeout: number,
}

const messages:Ref<Message[]> = ref([]);

export default function useMessages() {

  const addMessage  = (text: string,
                       type: MessageType,
                       timeout: number):Message => {
    const id= Date.now();

    const newMessage = {
      id,
      text,
      type,
      isActive: true,
      timeout
    }

    messages.value.push(newMessage);

    return newMessage;

  }

  const addError = (text:string, timeout: number = 0):Message => {
    return addMessage(text, 'error', timeout);
  }

  const add = (text:string, timeout: number = 5):Message => {
    return addMessage(text, 'success', timeout);
  }

  const addInfo = (text:string, timeout: number = 5):Message => {
    return addMessage(text, 'info', timeout);
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

  const unreadMessages = computed(() => messages.value.filter(m => m.isActive === true));

  const unreadMessagesCount = computed(() => unreadMessages.value.length);

  const hasMessage = computed(() => unreadMessagesCount.value > 0);

  const lastUnreadMessage = computed(() => unreadMessagesCount.value > 0 ? unreadMessages.value[0]: null);

  return {
    addMessage,
    addError,
    addInfo,
    add,
    readAllMessages,
    readMessage,
    messages: unreadMessages,
    count: unreadMessagesCount,
    hasMessage,
    last: lastUnreadMessage
  };
}
