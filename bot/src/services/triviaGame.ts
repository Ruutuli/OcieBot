import { ITrivia } from '../database/models/Trivia';

export interface TriviaGameSession {
  userId: string;
  guildId: string;
  channelId: string;
  currentTrivia: ITrivia | null; // Current question being asked
  correctOCName: string; // The correct OC name for current question
  wrongLimit: number; // Number of wrong answers allowed
  wrongCount: number; // Current wrong answer count
  correctCount: number; // Current correct answer count
  questionsAsked: number; // Total questions asked
  startTime: Date;
  lastAnswerTime: Date | null;
  answeredTriviaIds: Set<string>; // Track which trivia IDs have been asked
}

const activeGames = new Map<string, TriviaGameSession>(); // key: userId

export function startTriviaGame(
  userId: string,
  guildId: string,
  channelId: string,
  wrongLimit: number = 3
): TriviaGameSession {
  const session: TriviaGameSession = {
    userId,
    guildId,
    channelId,
    currentTrivia: null,
    correctOCName: '',
    wrongLimit,
    wrongCount: 0,
    correctCount: 0,
    questionsAsked: 0,
    startTime: new Date(),
    lastAnswerTime: null,
    answeredTriviaIds: new Set()
  };
  activeGames.set(userId, session);
  return session;
}

export function getActiveGameByUserId(userId: string): TriviaGameSession | null {
  return activeGames.get(userId) || null;
}

export function endTriviaGame(userId: string): void {
  activeGames.delete(userId);
}

export function setCurrentQuestion(game: TriviaGameSession, trivia: ITrivia): void {
  // Handle ocId whether it's populated (object) or just an ObjectId
  const ocName = typeof trivia.ocId === 'object' && trivia.ocId !== null
    ? (trivia.ocId as any).name || 'Unknown OC'
    : 'Unknown OC';

  game.currentTrivia = trivia;
  game.correctOCName = ocName;
  game.questionsAsked++;
  const triviaId = trivia.id || trivia._id.toString();
  game.answeredTriviaIds.add(triviaId);
  game.lastAnswerTime = null;
}

export function submitAnswer(userId: string, ocName: string): { correct: boolean; gameOver: boolean } {
  const game = getActiveGameByUserId(userId);
  if (!game || !game.currentTrivia) {
    return { correct: false, gameOver: true };
  }

  // Check if already answered this question
  if (game.lastAnswerTime !== null) {
    return { correct: false, gameOver: false };
  }

  const isCorrect = checkAnswer(game, ocName);
  game.lastAnswerTime = new Date();

  if (isCorrect) {
    game.correctCount++;
  } else {
    game.wrongCount++;
  }

  const gameOver = game.wrongCount >= game.wrongLimit;
  return { correct: isCorrect, gameOver };
}

export function checkAnswer(game: TriviaGameSession, userOCName: string): boolean {
  // Case-insensitive comparison
  return game.correctOCName.toLowerCase().trim() === userOCName.toLowerCase().trim();
}

export function getScoreboard(game: TriviaGameSession): string {
  return `**Score:** ${game.correctCount} correct, ${game.wrongCount}/${game.wrongLimit} wrong\n**Questions:** ${game.questionsAsked} answered`;
}

