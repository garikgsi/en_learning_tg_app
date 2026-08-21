import {afterEach, describe, expect, it, vi} from 'vitest';
import {selectCheckWord} from '@/stores/translateStore';

describe('selectCheckWord', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('only splits translations by commas and keeps hyphens', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(selectCheckWord(' кока-кола, газировка ')).toEqual({
      checkWord: 'кока-кола',
      otherCheckWords: ['газировка'],
    });
  });

  it('combines primary translations with structured variants', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(selectCheckWord(['дом', 'жилище', ' дом '])).toEqual({
      checkWord: 'дом',
      otherCheckWords: ['жилище'],
    });
  });
});
