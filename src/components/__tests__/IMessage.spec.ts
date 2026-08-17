import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {h, nextTick} from 'vue';
import {createVuetify} from 'vuetify';
import IMessage from '@/components/IMessage.vue';
import useMessages from '@/use/messages';

describe('IMessage', () => {
  const mountMessage = () => mount(IMessage, {
    global: {
      plugins: [createVuetify()],
    },
  });

  afterEach(() => {
    useMessages().readAllMessages();
    vi.useRealTimers();
  });

  it('keeps an error without a timeout visible', async () => {
    vi.useFakeTimers();
    const messages = useMessages();
    const wrapper = mountMessage();

    messages.addError('Постоянная ошибка');
    await nextTick();
    vi.advanceTimersByTime(10_000);
    await nextTick();

    expect(wrapper.text()).toContain('Постоянная ошибка');
  });

  it('closes a timed info message', async () => {
    vi.useFakeTimers();
    const messages = useMessages();
    const wrapper = mountMessage();

    messages.addInfo('Временное сообщение', 3);
    await nextTick();
    vi.advanceTimersByTime(3_100);
    await nextTick();

    expect(wrapper.text()).not.toContain('Временное сообщение');
  });

  it('renders the append slot and reads a message after its action', async () => {
    const handler = vi.fn();
    const messages = useMessages();
    const wrapper = mount(IMessage, {
      global: {
        plugins: [createVuetify()],
      },
      slots: {
        append: ({message, runAction}) => h(
          'button',
          {onClick: () => runAction(message)},
          message.action?.title,
        ),
      },
    });

    messages.addWarning('Сохранённые данные', 0, {
      action: {title: 'Обновить', handler},
    });
    await nextTick();

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(handler).toHaveBeenCalledOnce();
    expect(wrapper.text()).not.toContain('Сохранённые данные');
  });

  it('keeps a refreshed message visible when the action recreates it', async () => {
    const messages = useMessages();
    const wrapper = mount(IMessage, {
      global: {
        plugins: [createVuetify()],
      },
      slots: {
        append: ({message, runAction}) => h(
          'button',
          {onClick: () => runAction(message)},
          message.action?.title,
        ),
      },
    });
    const showOfflineMessage = () => messages.addWarning(
      'Нет подключения к интернету',
      0,
      {
        key: 'offline-test',
        action: {
          title: 'Обновить',
          handler: async () => {
            showOfflineMessage();
          },
        },
      },
    );

    showOfflineMessage();
    await nextTick();
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Нет подключения к интернету');
  });
});
