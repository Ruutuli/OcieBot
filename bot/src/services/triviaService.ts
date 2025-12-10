import { Trivia, ITrivia } from '../database/models/Trivia';
import mongoose from 'mongoose';

export async function getTriviaById(id: string): Promise<ITrivia | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Trivia.findById(id).populate('ocId');
}

export async function createTrivia(data: {
  guildId: string;
  question: string;
  ocId: string;
  createdById: string;
}): Promise<ITrivia> {
  const trivia = new Trivia(data);
  return await trivia.save();
}

export async function getTriviaByGuild(guildId: string): Promise<ITrivia[]> {
  return await Trivia.find({ guildId }).populate('ocId').sort({ createdAt: -1 });
}

export async function getTriviaByOC(ocId: string): Promise<ITrivia[]> {
  if (!mongoose.Types.ObjectId.isValid(ocId)) return [];
  return await Trivia.find({ ocId }).populate('ocId').sort({ createdAt: -1 });
}

export async function getRandomTrivia(guildId: string): Promise<ITrivia | null> {
  const count = await Trivia.countDocuments({ guildId });
  if (count === 0) return null;
  const random = Math.floor(Math.random() * count);
  const trivias = await Trivia.find({ guildId }).populate('ocId').skip(random).limit(1);
  return trivias[0] || null;
}

export async function deleteTrivia(id: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const result = await Trivia.findByIdAndDelete(id);
  return !!result;
}

