import { ITrivia } from '../database/models/Trivia';

export interface TriviaGameSession {
  triviaId: string; // The trivia ID (like T1234)
  guildId: string;
  channelId: string;
  trivia: ITrivia;
  correctOCId: string; // The correct OC ID
  correctOCName: string; // The correct OC name
  startTime: Date;
  answers: Map<string, { ocName: string; time: Date }>; // userId -> { ocName, time }
}

const activeGames = new Map<string, TriviaGameSession>(); // key: triviaId

export function startTriviaGame(
  triviaId: string,
  guildId: string,
  channelId: string,
  trivia: ITrivia
): TriviaGameSession {
  // Handle ocId whether it's populated (object) or just an ObjectId
  const ocIdString = typeof trivia.ocId === 'object' && trivia.ocId !== null
    ? (trivia.ocId as any)._id?.toString() || trivia.ocId.toString()
    : trivia.ocId.toString();
  
  const ocName = typeof trivia.ocId === 'object' && trivia.ocId !== null
    ? (trivia.ocId as any).name || 'Unknown OC'
    : 'Unknown OC';

  const session: TriviaGameSession = {
    triviaId,
    guildId,
    channelId,
    trivia,
    correctOCId: ocIdString,
    correctOCName: ocName,
    startTime: new Date(),
    answers: new Map()
  };
  activeGames.set(triviaId, session);
  return session;
}

export function getActiveGameByTriviaId(triviaId: string): TriviaGameSession | null {
  return activeGames.get(triviaId) || null;
}

export function getActiveGame(guildId: string, channelId: string): TriviaGameSession | null {
  // Find game by guild and channel
  for (const game of activeGames.values()) {
    if (game.guildId === guildId && game.channelId === channelId) {
      return game;
    }
  }
  return null;
}

export function endTriviaGame(triviaId: string): void {
  activeGames.delete(triviaId);
}

export function submitAnswer(triviaId: string, userId: string, ocName: string): boolean {
  const game = getActiveGameByTriviaId(triviaId);
  if (!game) return false;
  if (game.answers.has(userId)) return false; // Already answered
  game.answers.set(userId, { ocName, time: new Date() });
  return true;
}

export function checkAnswer(game: TriviaGameSession, userOCName: string): boolean {
  // Case-insensitive comparison
  return game.correctOCName.toLowerCase().trim() === userOCName.toLowerCase().trim();
}

