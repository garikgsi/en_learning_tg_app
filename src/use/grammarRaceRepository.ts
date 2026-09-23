import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorStatus,
  isNetworkError,
} from '@/api/errors';
import {httpGrammarRaceDriver} from '@/api/http/grammarRace';
import {indexedDbGrammarRaceDriver} from '@/api/indexedDb/grammarRace';
import type {
  AbandonGrammarRacePayload,
  CompleteGrammarRacePayload,
  GrammarRaceGameCode,
  GrammarRacePlayMode,
  GrammarRaceSession,
  GrammarRaceStatus,
  PendingGrammarRaceResult,
} from '@/api/types/grammarRace';
import type {CompletionSyncSummary} from '@/use/types/exerciseRepository';

const syncRequests = new Map<string, Promise<CompletionSyncSummary>>();

const retryDelayMs = (attemptsCount: number): number => {
  return Math.min(30_000 * 2 ** Math.max(attemptsCount - 1, 0), 15 * 60_000);
};

const startStorageKey = (
  userId: string,
  gameCode: GrammarRaceGameCode,
  playMode: GrammarRacePlayMode,
): string => `en-learning:grammar-race-start:${userId}:${gameCode}:${playMode}`;

const readStartId = (userId: string, gameCode: GrammarRaceGameCode, playMode: GrammarRacePlayMode): string => {
  const key = startStorageKey(userId, gameCode, playMode);

  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);

    return created;
  } catch {
    return crypto.randomUUID();
  }
};

const clearStartId = (userId: string, gameCode: GrammarRaceGameCode, playMode: GrammarRacePlayMode): void => {
  try {
    localStorage.removeItem(startStorageKey(userId, gameCode, playMode));
  } catch {
    // The server-side idempotency still protects an in-flight request.
  }
};

const performSync = async (userId: string): Promise<CompletionSyncSummary> => {
  const pending = await indexedDbGrammarRaceDriver.getPending(userId);
  let sent = 0;

  for (const result of pending) {
    if (
      result.nextRetryAt
      && new Date(result.nextRetryAt).getTime() > Date.now()
    ) {
      continue;
    }

    try {
      if (result.operation === 'complete') {
        await httpGrammarRaceDriver.complete(
          result.sessionId,
          result.payload as CompleteGrammarRacePayload,
        );
      } else {
        await httpGrammarRaceDriver.abandon(
          result.sessionId,
          result.payload as AbandonGrammarRacePayload,
        );
      }
      await indexedDbGrammarRaceDriver.removeFromOutbox(result.clientResultId);
      sent++;
    } catch (error) {
      const status = getApiErrorStatus(error);
      const code = getApiErrorCode(error);
      const retryable = isNetworkError(error)
        || status === null
        || status >= 500
        || status === 401;
      const attemptsCount = result.attemptsCount + 1;

      await indexedDbGrammarRaceDriver.updateOutbox({
        ...result,
        status: retryable ? 'pending' : 'failed',
        attemptsCount,
        nextRetryAt: retryable && !isNetworkError(error) && status !== 401
          ? new Date(Date.now() + retryDelayMs(attemptsCount)).toISOString()
          : null,
        lastError: code
          ?? getApiErrorMessage(error, 'Не удалось отправить результат игры'),
      });

      if (isNetworkError(error) || status === 401) break;
    }
  }

  const outbox = await indexedDbGrammarRaceDriver.getAllOutbox(userId);

  return {
    sent,
    pending: outbox.filter(item => item.status === 'pending').length,
    failed: outbox.filter(item => item.status === 'failed').length,
  };
};

const repository = {
  async getStatus(
    userId: string,
    gameCode: GrammarRaceGameCode,
  ): Promise<GrammarRaceStatus> {
    const status = await httpGrammarRaceDriver.getStatus(gameCode);

    if (status.activeSession) {
      await indexedDbGrammarRaceDriver.saveSession(userId, status.activeSession);
    } else {
      await indexedDbGrammarRaceDriver.removeSession(userId, gameCode);
    }

    return status;
  },

  getCachedSession(
    userId: string,
    gameCode: GrammarRaceGameCode,
  ): Promise<GrammarRaceSession | null> {
    return indexedDbGrammarRaceDriver.getSession(userId, gameCode);
  },

  async start(
    userId: string,
    gameCode: GrammarRaceGameCode,
    playMode: GrammarRacePlayMode,
  ): Promise<GrammarRaceSession> {
    const clientRequestId = readStartId(userId, gameCode, playMode);

    try {
      const {item} = await httpGrammarRaceDriver.start(
        gameCode,
        clientRequestId,
        playMode,
      );
      await indexedDbGrammarRaceDriver.saveSession(userId, item);
      clearStartId(userId, gameCode, playMode);

      return item;
    } catch (error) {
      if (!isNetworkError(error)) clearStartId(userId, gameCode, playMode);
      throw error;
    }
  },

  async enqueueCompletion(
    userId: string,
    session: GrammarRaceSession,
    payload: CompleteGrammarRacePayload,
  ): Promise<CompletionSyncSummary> {
    await this.enqueue(userId, session, 'complete', payload);

    return this.syncPending(userId);
  },

  async enqueueAbandon(
    userId: string,
    session: GrammarRaceSession,
    payload: AbandonGrammarRacePayload,
  ): Promise<CompletionSyncSummary> {
    await this.enqueue(userId, session, 'abandon', payload);

    return this.syncPending(userId);
  },

  async enqueue(
    userId: string,
    session: GrammarRaceSession,
    operation: PendingGrammarRaceResult['operation'],
    payload: PendingGrammarRaceResult['payload'],
  ): Promise<void> {
    const pending: PendingGrammarRaceResult = {
      clientResultId: payload.clientResultId,
      userId,
      sessionId: session.id,
      gameCode: session.gameCode,
      operation,
      payload,
      status: 'pending',
      attemptsCount: 0,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
    };

    await indexedDbGrammarRaceDriver.enqueue(pending);
  },

  async syncPending(userId: string): Promise<CompletionSyncSummary> {
    const existing = syncRequests.get(userId);
    if (existing) return existing;

    const request = performSync(userId).finally(() => {
      syncRequests.delete(userId);
    });
    syncRequests.set(userId, request);

    return request;
  },

  async getOutboxSummary(userId: string): Promise<CompletionSyncSummary> {
    const outbox = await indexedDbGrammarRaceDriver.getAllOutbox(userId);

    return {
      sent: 0,
      pending: outbox.filter(item => item.status === 'pending').length,
      failed: outbox.filter(item => item.status === 'failed').length,
    };
  },
};

export const useGrammarRaceRepository = () => repository;
