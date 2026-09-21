import {mount} from '@vue/test-utils';
import {createVuetify} from 'vuetify';
import {describe, expect, it} from 'vitest';
import IChipWordList from '@/components/IChipWordList.vue';

describe('IChipWordList', () => {
  it('keeps the singular chip and forwards both audio ids for a plural word', async () => {
    const wrapper = mount(IChipWordList, {
      global: {
        plugins: [createVuetify()],
      },
      props: {
        words: [{
          id: 42,
          en: 'louse',
          ru: 'вошь',
          color: 'green',
          plural: {
            id: 7,
            en: 'lice',
            ru: 'вши',
          },
        }],
      },
    });

    expect(wrapper.get('.v-chip').text()).toBe('louse');
    await wrapper.get('.v-chip').trigger('click');

    expect(wrapper.emitted('play')).toEqual([[42, 7]]);
    wrapper.unmount();
  });
});
