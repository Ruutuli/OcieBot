import { ITrivia } from '../database/models/Trivia';
import { IOC } from '../database/models/OC';

export interface TriviaGameSession {
  guildId: string;
  channelId: string;
  trivia: ITrivia;
  choices: IOC[]; // Multiple choice OCs (includes correct answer)
  correctOCId: string; // The correct OC ID
  startTime: Date;
  answers: Map<string, { ocId: string; time: Date }>; // userId -> { ocId, time }
}

const activeGames = new Map<string, TriviaGameSession>();

export function startTriviaGame(
  guildId: string,
  channelId: string,
  trivia: ITrivia,
  choices: IOC[]
): TriviaGameSession {
  const session: TriviaGameSession = {
    guildId,
    channelId,
    trivia,
    choices,
    correctOCId: trivia.ocId.toString(),
    startTime: new Date(),
    answers: new Map()
  };
  activeGames.set(`${guildId}-${channelId}`, session);
  return session;
}

export function getActiveGame(guildId: string, channelId: string): TriviaGameSession | null {
  return activeGames.get(`${guildId}-${channelId}`) || null;
}

export function endTriviaGame(guildId: string, channelId: string): void {
  activeGames.delete(`${guildId}-${channelId}`);
}

export function submitAnswer(guildId: string, channelId: string, userId: string, ocId: string): boolean {
  const game = getActiveGame(guildId, channelId);
  if (!game) return false;
  if (game.answers.has(userId)) return false; // Already answered
  game.answers.set(userId, { ocId, time: new Date() });
  return true;
}

export function checkAnswer(game: TriviaGameSession, userOCId: string): boolean {
  return game.correctOCId === userOCId;
}

