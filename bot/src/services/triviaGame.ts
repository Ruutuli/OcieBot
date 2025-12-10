import { ITrivia } from '../database/models/Trivia';

export interface TriviaGameSession {
  guildId: string;
  channelId: string;
  question: ITrivia;
  startTime: Date;
  answers: Map<string, Date>; // userId -> answer time
}

const activeGames = new Map<string, TriviaGameSession>();

export function startTriviaGame(guildId: string, channelId: string, question: ITrivia): TriviaGameSession {
  const session: TriviaGameSession = {
    guildId,
    channelId,
    question,
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

export function submitAnswer(guildId: string, channelId: string, userId: string): boolean {
  const game = getActiveGame(guildId, channelId);
  if (!game) return false;
  if (game.answers.has(userId)) return false; // Already answered
  game.answers.set(userId, new Date());
  return true;
}

export function checkAnswer(game: TriviaGameSession, userAnswer: string): boolean {
  const correctAnswer = game.question.answer.toLowerCase().trim();
  const normalizedUserAnswer = userAnswer.toLowerCase().trim();
  
  // Exact match
  if (normalizedUserAnswer === correctAnswer) return true;
  
  // Check if user answer contains the correct answer (for longer answers)
  if (normalizedUserAnswer.includes(correctAnswer) || correctAnswer.includes(normalizedUserAnswer)) {
    // Only allow if both are reasonably similar in length
    const lengthDiff = Math.abs(normalizedUserAnswer.length - correctAnswer.length);
    if (lengthDiff <= 5) return true;
  }
  
  return false;
}

