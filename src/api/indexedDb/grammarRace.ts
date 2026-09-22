import {indexedDb, indexedDbStores} from '@/api/indexedDb';
import type {
  GrammarRaceGameCode,
  GrammarRaceSession,
  PendingGrammarRaceResult,
} from '@/api/types/grammarRace';

type CachedGrammarRaceSession = {
  key: string
  userId: string
  gameCode: GrammarRaceGameCode
  session: GrammarRaceSession
  cachedAt: string
}

const sessionKey = (userId: string, gameCode: GrammarRaceGameCode): string => {
  return `${userId}:${gameCode}`;
};

export const indexedDbGrammarRaceDriver = {
  async saveSession(userId: string, session: GrammarRaceSession): Promise<void> {
    await indexedDb.put<CachedGrammarRaceSession>(
      indexedDbStores.grammarRaceSessions,
      {
        key: sessionKey(userId, session.gameCode),
        userId,
        gameCode: session.gameCode,
        session,
        cachedAt: new Date().toISOString(),
      },
    );
  },

  async getSession(
    userId: string,
    gameCode: GrammarRaceGameCode,
  ): Promise<GrammarRaceSession | null> {
    const cached = await indexedDb.get<CachedGrammarRaceSession>(
      indexedDbStores.grammarRaceSessions,
      sessionKey(userId, gameCode),
    );

    return cached?.session ?? null;
  },

  async removeSession(userId: string, gameCode: GrammarRaceGameCode): Promise<void> {
    await indexedDb.delete(
      indexedDbStores.grammarRaceSessions,
      sessionKey(userId, gameCode),
    );
  },

  async enqueue(result: PendingGrammarRaceResult): Promise<void> {
    await indexedDb.mutateStores([
      {
        store: indexedDbStores.grammarRaceOutbox,
        type: 'put',
        value: result,
      },
      {
        store: indexedDbStores.grammarRaceSessions,
        type: 'delete',
        key: sessionKey(result.userId, result.gameCode),
      },
    ]);
  },

  async getPending(userId: string): Promise<PendingGrammarRaceResult[]> {
    const results = await this.getAllOutbox(userId);

    return results.filter(result => result.status === 'pending');
  },

  async getAllOutbox(userId: string): Promise<PendingGrammarRaceResult[]> {
    return indexedDb.getAllFromIndex<PendingGrammarRaceResult>(
      indexedDbStores.grammarRaceOutbox,
      'by-user-created-at',
      IDBKeyRange.bound([userId, ''], [userId, '\uffff']),
    );
  },

  async updateOutbox(result: PendingGrammarRaceResult): Promise<void> {
    await indexedDb.put(indexedDbStores.grammarRaceOutbox, result);
  },

  async removeFromOutbox(clientResultId: string): Promise<void> {
    await indexedDb.delete(indexedDbStores.grammarRaceOutbox, clientResultId);
  },
};
