import {mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {nextTick} from 'vue';
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
});
