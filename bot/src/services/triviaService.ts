import { Trivia, ITrivia } from '../database/models/Trivia';
import mongoose from 'mongoose';

export async function getTriviaById(id: string): Promise<ITrivia | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Trivia.findById(id);
}

export async function createTrivia(data: {
  guildId: string;
  question: string;
  answer: string;
  category: 'OC Trivia' | 'Fandom Trivia' | 'Yume Trivia';
  ocId?: string;
  fandom?: string;
  createdById: string;
}): Promise<ITrivia> {
  const trivia = new Trivia(data);
  return await trivia.save();
}

export async function getTriviaByGuild(guildId: string, category?: string): Promise<ITrivia[]> {
  const query: any = { guildId };
  if (category) {
    query.category = category;
  }
  return await Trivia.find(query).sort({ createdAt: -1 });
}

export async function getRandomTrivia(guildId: string, category?: string): Promise<ITrivia | null> {
  const query: any = { guildId };
  if (category) {
    query.category = category;
  }
  const count = await Trivia.countDocuments(query);
  if (count === 0) return null;
  const random = Math.floor(Math.random() * count);
  const trivias = await Trivia.find(query).skip(random).limit(1);
  return trivias[0] || null;
}

export async function deleteTrivia(id: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const result = await Trivia.findByIdAndDelete(id);
  return !!result;
}

