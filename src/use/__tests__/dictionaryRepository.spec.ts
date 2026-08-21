import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AxiosError} from 'axios';
import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import {httpDictionaryDriver} from '@/api/http/dictionary';
import type {ApiDictionaryWord} from '@/api/types/dictionary';
import type {CachedDictionaryWord} from '@/api/indexedDb/types/dictionary';
import {useDictionaryRepository} from '@/use/dictionaryRepository';

const word = (
  id: number,
  ru: string,
  grade: number,
  createdAt: string,
): ApiDictionaryWord => ({
  id,
  ru,
  en: `word-${id}`,
  ruVariants: [],
  enVariants: [],
  transcription: null,
  grade,
  createdAt,
  repeatCount: 0,
  successfulRepeatCount: 0,
  failedRepeatCount: 0,
  is_active: false,
});

describe('dictionaryRepository', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      indexedDb.clear(indexedDbStores.dictionaryWords),
      indexedDb.clear(indexedDbStores.dictionaryMetadata),
    ]);
  });

  it('returns a public audio URL without making an authorized request', () => {
    expect(useDictionaryRepository().getWordAudioUrl(42)).toBe(
      'http://localhost:8088/api/v1/dictionary/words/42/audio',
    );
  });

  it('downloads the complete dictionary and paginates available words locally', async () => {
    const synchronize = vi.spyOn(httpDictionaryDriver, 'synchronize')
      .mockResolvedValueOnce({
        items: [
          word(1, 'Яблоко', 1, '2026-08-13T10:00:00Z'),
        ],
        latestCreatedAt: '2026-08-14T10:00:00Z',
        availableGrade: 2,
        revision: 4,
        isFullSync: true,
        page: 1,
        perPage: 500,
        lastPage: 2,
      })
      .mockResolvedValueOnce({
        items: [word(2, 'Арбуз', 2, '2026-08-14T10:00:00Z')],
        latestCreatedAt: '2026-08-14T10:00:00Z',
        availableGrade: 2,
        revision: 4,
        isFullSync: true,
        page: 2,
        perPage: 500,
        lastPage: 2,
      });
    const repository = useDictionaryRepository();

    const firstPage = await repository.getPage(
      'dictionary-page-user',
      undefined,
      1,
      1,
    );
    const secondPage = await repository.getPage(
      'dictionary-page-user',
      undefined,
      2,
      1,
    );

    expect(synchronize).toHaveBeenCalledTimes(2);
    expect(synchronize.mock.calls).toEqual([
      [1, 500, undefined, undefined, undefined],
      [2, 500, undefined, undefined, undefined],
    ]);
    expect(firstPage.data.items.map(item => item.id)).toEqual([2]);
    expect(secondPage.data.items.map(item => item.id)).toEqual([1]);
    expect(firstPage.data.total).toBe(2);
  });

  it('requests only words created after the cached maximum date', async () => {
    const synchronize = vi.spyOn(httpDictionaryDriver, 'synchronize')
      .mockResolvedValueOnce({
        items: [word(1, 'Дом', 1, '2026-08-13T10:00:00Z')],
        latestCreatedAt: '2026-08-13T10:00:00Z',
        availableGrade: 3,
        revision: 4,
        isFullSync: true,
        page: 1,
        perPage: 500,
        lastPage: 1,
      })
      .mockResolvedValueOnce({
        items: [word(2, 'Школа', 1, '2026-08-14T10:00:00Z')],
        latestCreatedAt: '2026-08-14T10:00:00Z',
        availableGrade: 3,
        revision: 4,
        isFullSync: false,
        page: 1,
        perPage: 500,
        lastPage: 1,
      });
    const repository = useDictionaryRepository();

    await repository.synchronize('dictionary-sync-user', true);
    await repository.synchronize('dictionary-sync-user', true);
    const page = await repository.getPage(
      'dictionary-sync-user',
      undefined,
      1,
      30,
    );

    expect(synchronize.mock.calls).toEqual([
      [1, 500, undefined, undefined, undefined],
      [1, 500, '2026-08-13T10:00:00Z', 3, 4],
    ]);
    expect(page.data.items.map(item => item.id)).toEqual([1, 2]);
  });

  it('uses cached pages when synchronization fails without a network', async () => {
    const synchronize = vi.spyOn(httpDictionaryDriver, 'synchronize')
      .mockResolvedValueOnce({
        items: [word(1, 'Дом', 1, '2026-08-13T10:00:00Z')],
        latestCreatedAt: '2026-08-13T10:00:00Z',
        availableGrade: 3,
        revision: 4,
        isFullSync: true,
        page: 1,
        perPage: 500,
        lastPage: 1,
      })
      .mockRejectedValueOnce(new AxiosError('Network unavailable'));
    const repository = useDictionaryRepository();

    await repository.synchronize('dictionary-offline-user', true);
    const synchronization = await repository.synchronize(
      'dictionary-offline-user',
      true,
    );
    const page = await repository.getPage(
      'dictionary-offline-user',
      'дом',
      1,
      30,
    );

    expect(synchronization).toEqual({
      source: 'indexedDb',
      fallbackReason: 'network',
    });
    expect(page.source).toBe('indexedDb');
    expect(page.data.items.map(item => item.id)).toEqual([1]);
  });

  it('keeps dictionary data isolated between users on the same device', async () => {
    const firstUserWord = word(1, 'Дом', 1, '2026-08-13T10:00:00Z');
    const secondUserWord = {
      ...word(1, 'Дом', 1, '2026-08-13T10:00:00Z'),
      is_active: true,
    };
    vi.spyOn(httpDictionaryDriver, 'synchronize')
      .mockResolvedValueOnce({
        items: [firstUserWord],
        latestCreatedAt: firstUserWord.createdAt,
        availableGrade: 1,
        revision: 4,
        isFullSync: true,
        page: 1,
        perPage: 500,
        lastPage: 1,
      })
      .mockResolvedValueOnce({
        items: [secondUserWord],
        latestCreatedAt: secondUserWord.createdAt,
        availableGrade: 1,
        revision: 4,
        isFullSync: true,
        page: 1,
        perPage: 500,
        lastPage: 1,
      });
    const repository = useDictionaryRepository();

    const firstUserPage = await repository.getPage(
      'dictionary-first-user',
      undefined,
      1,
      30,
    );
    const secondUserPage = await repository.getPage(
      'dictionary-second-user',
      undefined,
      1,
      30,
    );

    expect(firstUserPage.data.items[0].is_active).toBe(false);
    expect(secondUserPage.data.items[0].is_active).toBe(true);
  });

  it('looks up and stores a reviewed word in the local cache', async () => {
    const storedWord = {
      ...word(7, 'Магазин', 3, '2026-08-21T10:00:00Z'),
      en: 'store',
      transcription: '/stɔː/',
    };
    const lookup = vi.spyOn(httpDictionaryDriver, 'lookupWord')
      .mockResolvedValue({
        russian: 'магазин',
        english: 'store',
        transcription: '/stɔː/',
        existingWords: [],
      });
    vi.spyOn(httpDictionaryDriver, 'storeWord').mockResolvedValue({
      item: storedWord,
      wasCreated: true,
    });
    const repository = useDictionaryRepository();

    const preview = await repository.lookupWord('магазин', 'ru');
    const stored = await repository.storeWord('dictionary-store-user', {
      russian: preview.russian,
      english: preview.english,
      transcription: preview.transcription,
    });
    const cached = await indexedDb.getAllFromIndex<CachedDictionaryWord>(
      indexedDbStores.dictionaryWords,
      'by-user',
      'dictionary-store-user',
    );

    expect(lookup).toHaveBeenCalledWith('магазин', 'ru');
    expect(stored.wasCreated).toBe(true);
    expect(cached).toHaveLength(1);
    expect(cached[0].word.transcription).toBe('/stɔː/');
  });
});
