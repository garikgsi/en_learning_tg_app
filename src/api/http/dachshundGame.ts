import {apiBaseUrl} from '@/api/client';
import {http} from '@/api/http';
import type {
  DachshundGameAudioManifest,
  DachshundGameRecords,
  DachshundGameResult,
} from '@/api/types/dachshundGame';

function resolveApiAssetUrl(path: string): string {
  const resolvedBaseUrl = new URL(apiBaseUrl, window.location.origin);
  return new URL(path, resolvedBaseUrl).toString();
}

export const httpDachshundGameDriver = {
  getRecords(): Promise<DachshundGameRecords> {
    return http.get('/dachshund-game/records');
  },

  saveResult(score: number): Promise<DachshundGameResult> {
    return http.post('/dachshund-game/results', {score});
  },

  getAudioManifest(): Promise<DachshundGameAudioManifest> {
    return http.get('/dachshund-game/audio');
  },

  async getLetterAudio(path: string): Promise<Blob> {
    const response = await fetch(resolveApiAssetUrl(path), {
      cache: 'force-cache',
    });

    if (!response.ok) {
      throw new Error(`Unable to preload letter audio: ${response.status}`);
    }

    return response.blob();
  },
};
