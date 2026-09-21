import {createPinia, setActivePinia} from 'pinia';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useDictionaryStore} from '@/stores/dictionaryStore';

type AudioEvent = 'canplaythrough' | 'ended' | 'error';

class AudioMock {
  static instances: AudioMock[] = [];

  readonly listeners = new Map<AudioEvent, () => void>();
  readonly play = vi.fn(() => Promise.resolve());
  readonly pause = vi.fn();
  readonly removeAttribute = vi.fn();
  readonly load = vi.fn();
  preload = '';
  readyState = 0;
  src = '';

  constructor() {
    AudioMock.instances.push(this);
  }

  addEventListener(event: AudioEvent, listener: () => void): void {
    this.listeners.set(event, listener);
  }

  removeEventListener(event: AudioEvent, listener: () => void): void {
    if (this.listeners.get(event) === listener) {
      this.listeners.delete(event);
    }
  }

  emit(event: AudioEvent): void {
    this.listeners.get(event)?.();
  }
}

describe('dictionaryStore plural audio', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    AudioMock.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal('Audio', AudioMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('loads both forms together before playing them with a fixed pause', async () => {
    const playback = useDictionaryStore().playPluralPairAudio(42, 7);

    expect(AudioMock.instances).toHaveLength(2);
    expect(AudioMock.instances[0].load).toHaveBeenCalledOnce();
    expect(AudioMock.instances[1].load).toHaveBeenCalledOnce();
    expect(AudioMock.instances[0].play).not.toHaveBeenCalled();
    expect(AudioMock.instances[1].play).not.toHaveBeenCalled();
    expect(useDictionaryStore().audioPreparingWordId).toBe(42);

    AudioMock.instances[0].emit('canplaythrough');
    await Promise.resolve();
    expect(AudioMock.instances[0].play).not.toHaveBeenCalled();

    AudioMock.instances[1].emit('canplaythrough');
    await vi.advanceTimersByTimeAsync(0);

    expect(AudioMock.instances[0].play).toHaveBeenCalledOnce();
    expect(AudioMock.instances[1].play).not.toHaveBeenCalled();
    expect(useDictionaryStore().audioPreparingWordId).toBeNull();

    AudioMock.instances[0].emit('ended');
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(399);
    expect(AudioMock.instances[1].play).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(AudioMock.instances[1].play).toHaveBeenCalledOnce();

    AudioMock.instances[1].emit('ended');
    await playback;

    expect(useDictionaryStore().audioLoadingWordId).toBeNull();
  });
});
