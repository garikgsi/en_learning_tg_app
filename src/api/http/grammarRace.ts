import {http} from '@/api/http';
import type {
  AbandonGrammarRacePayload,
  CompleteGrammarRacePayload,
  GrammarRaceAchievementsResponse,
  GrammarRaceGameCode,
  GrammarRacePlayMode,
  GrammarRaceSession,
  GrammarRaceStatus,
} from '@/api/types/grammarRace';

export const httpGrammarRaceDriver = {
  getAchievements(): Promise<GrammarRaceAchievementsResponse> {
    return http.get('/grammar-race-achievements');
  },

  getStatus(gameCode: GrammarRaceGameCode): Promise<GrammarRaceStatus> {
    return http.get(`/grammar-race-games/${gameCode}/status`);
  },

  start(
    gameCode: GrammarRaceGameCode,
    clientRequestId: string,
    playMode: GrammarRacePlayMode,
  ): Promise<{item: GrammarRaceSession}> {
    return http.post(`/grammar-race-games/${gameCode}/sessions`, {
      clientRequestId,
      playMode,
    });
  },

  getSession(sessionId: string): Promise<{item: GrammarRaceSession}> {
    return http.get(`/grammar-race-sessions/${sessionId}`);
  },

  complete(
    sessionId: string,
    payload: CompleteGrammarRacePayload,
  ): Promise<{item: GrammarRaceSession}> {
    return http.post(`/grammar-race-sessions/${sessionId}/complete`, payload);
  },

  abandon(
    sessionId: string,
    payload: AbandonGrammarRacePayload,
  ): Promise<{item: GrammarRaceSession}> {
    return http.post(`/grammar-race-sessions/${sessionId}/abandon`, payload);
  },
};
