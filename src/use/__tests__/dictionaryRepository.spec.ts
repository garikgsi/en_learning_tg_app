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
      [1, 500, undefined, undefined, undefined, undefined],
      [2, 500, undefined, undefined, undefined, undefined],
    ]);
    expect(firstPage.data.items.map(item => item.id)).toEqual([2]);
    expect(secondPage.data.items.map(item => item.id)).toEqual([1]);
    expect(firstPage.data.total).toBe(2);
  });

  it('requests created and edited words after the cached dates', async () => {
    const synchronize = vi.spyOn(httpDictionaryDriver, 'synchronize')
      .mockResolvedValueOnce({
        items: [word(1, 'Дом', 1, '2026-08-13T10:00:00Z')],
        latestCreatedAt: '2026-08-13T10:00:00Z',
        latestUpdatedAt: '2026-08-13T11:00:00Z',
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
        latestUpdatedAt: '2026-08-14T11:00:00Z',
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
      [1, 500, undefined, undefined, undefined, undefined],
      [1, 500, '2026-08-13T10:00:00Z', 3, 4, '2026-08-13T11:00:00Z'],
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

  it('searches cached dictionary words by translation variants', async () => {
    const cachedWord = {
      ...word(1, 'Дом', 1, '2026-08-13T10:00:00Z'),
      en: 'home',
      ruVariants: ['Жилище'],
      enVariants: ['House'],
    };
    vi.spyOn(httpDictionaryDriver, 'synchronize').mockResolvedValueOnce({
      items: [cachedWord],
      latestCreatedAt: cachedWord.createdAt,
      availableGrade: 1,
      revision: 7,
      isFullSync: true,
      page: 1,
      perPage: 500,
      lastPage: 1,
    });
    const repository = useDictionaryRepository();

    const russianPage = await repository.getPage(
      'dictionary-variant-search-user',
      'жил',
      1,
      30,
    );
    const englishPage = await repository.getPage(
      'dictionary-variant-search-user',
      'HOU',
      1,
      30,
    );

    expect(russianPage.data.items.map(item => item.id)).toEqual([1]);
    expect(englishPage.data.items.map(item => item.id)).toEqual([1]);
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

  it('replaces a fifth-grade cache when its server revision changes and removes moved words', async () => {
    const house = {...word(1, 'Дом', 5, '2026-08-01T00:00:00Z'), en: 'home'};
    const moved = word(2, 'Университет', 5, house.createdAt);
    const synchronize = vi.spyOn(httpDictionaryDriver, 'synchronize').mockResolvedValueOnce({
      items: [house, moved], latestCreatedAt: house.createdAt, latestUpdatedAt: house.createdAt,
      availableGrade: 5, revision: 7, isFullSync: true, page: 1, perPage: 500, lastPage: 1,
    }).mockResolvedValueOnce({
      items: [{...house, enVariants: ['house']}], latestCreatedAt: house.createdAt, latestUpdatedAt: '2026-09-18T10:00:00Z',
      availableGrade: 5, revision: 8, isFullSync: true, page: 1, perPage: 500, lastPage: 1,
    });
    const repository = useDictionaryRepository();
    await repository.getPage('fifth-grade-version-refresh', undefined, 1, 30);
    // Opening the dictionary checks the server even within the normal cache TTL.
    const refreshed = await repository.getPage('fifth-grade-version-refresh', undefined, 1, 30, true);
    expect(synchronize).toHaveBeenCalledTimes(2);
    expect(synchronize).toHaveBeenLastCalledWith(1, 500, house.createdAt, 5, 7, house.createdAt);
    expect(refreshed.data.items).toHaveLength(1);
    expect(refreshed.data.items[0]).toMatchObject({id: 1, enVariants: ['house']});
    const metadata = await indexedDb.get<{revision: number}>(indexedDbStores.dictionaryMetadata, 'fifth-grade-version-refresh');
    expect(metadata?.revision).toBe(8);
  });

  it('shows every grade from an admin cache with no grade limit', async () => {
    vi.spyOn(httpDictionaryDriver, 'synchronize').mockResolvedValue({
      items: [word(1, 'Дом', 1, '2026-09-18T10:00:00Z'), word(2, 'Университет', 99, '2026-09-18T10:00:00Z')],
      latestCreatedAt: '2026-09-18T10:00:00Z',
      latestUpdatedAt: '2026-09-18T10:00:00Z',
      availableGrade: null, revision: 7, isFullSync: true, page: 1, perPage: 500, lastPage: 1,
    });
    const page = await useDictionaryRepository().getPage('dictionary-admin-all-grades', undefined, 1, 30);
    expect(page.data.total).toBe(2);
    expect(page.data.availableGrade).toBeNull();
  });

  it('refreshes legacy metadata without an update cursor before caching edited words', async () => {
    await indexedDb.put(indexedDbStores.dictionaryMetadata, {
      userId: 'dictionary-legacy-updates', latestCreatedAt: '2026-08-01T00:00:00Z', availableGrade: 2, revision: 7,
    });
    const synchronize = vi.spyOn(httpDictionaryDriver, 'synchronize').mockResolvedValue({
      items: [word(1, 'Дом', 1, '2026-08-01T00:00:00Z')],
      latestCreatedAt: '2026-08-01T00:00:00Z', latestUpdatedAt: '2026-09-18T10:00:00Z',
      availableGrade: 2, revision: 7, isFullSync: true, page: 1, perPage: 500, lastPage: 1,
    });
    await useDictionaryRepository().synchronize('dictionary-legacy-updates', true);
    expect(synchronize).toHaveBeenCalledWith(1, 500, undefined, 2, 7, undefined);
  });

  it('updates the cached row after editing and invalidates the recent synchronization', async () => {
    const original = {...word(1, 'Дом', 1, '2026-08-01T00:00:00Z'), en: 'home', repeatCount: 4, is_active: true};
    const edited = {...original, enVariants: ['house'], ruVariants: ['жилище']};
    const synchronize = vi.spyOn(httpDictionaryDriver, 'synchronize').mockResolvedValue({
      items: [original], latestCreatedAt: original.createdAt, latestUpdatedAt: original.createdAt,
      availableGrade: null, revision: 7, isFullSync: true, page: 1, perPage: 500, lastPage: 1,
    });
    vi.spyOn(httpDictionaryDriver, 'updateWord').mockResolvedValue({item: edited});
    const repository = useDictionaryRepository();
    await repository.getPage('dictionary-edited-cache', undefined, 1, 30);
    await repository.updateWord('dictionary-edited-cache', 1, {
      english: 'home', russian: 'Дом', englishVariants: ['house'], russianVariants: ['жилище'],
    });
    synchronize.mockResolvedValue({
      items: [edited], latestCreatedAt: original.createdAt, latestUpdatedAt: '2026-09-18T10:00:00Z',
      availableGrade: null, revision: 7, isFullSync: false, page: 1, perPage: 500, lastPage: 1,
    });
    const page = await repository.getPage('dictionary-edited-cache', 'жилище', 1, 30);
    expect(synchronize).toHaveBeenCalledTimes(2);
    expect(page.data.items[0]).toMatchObject({enVariants: ['house'], repeatCount: 4, is_active: true});
  });
});
