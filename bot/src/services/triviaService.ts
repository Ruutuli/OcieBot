import { Trivia, ITrivia } from '../database/models/Trivia';
import mongoose from 'mongoose';
import { generateCustomId, isValidCustomId } from '../utils/idGenerator';

export async function getTriviaById(id: string): Promise<ITrivia | null> {
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    return await Trivia.findOne({ id }).populate('ocId');
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    return await Trivia.findById(id).populate('ocId');
  }
  return null;
}

export async function createTrivia(data: {
  guildId: string;
  question: string;
  ocId: string;
  createdById: string;
}): Promise<ITrivia> {
  const id = await generateCustomId('T', Trivia);
  const trivia = new Trivia({ ...data, id });
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

export async function updateTrivia(id: string, data: {
  question?: string;
  ocId?: string;
}): Promise<ITrivia | null> {
  let trivia: ITrivia | null = null;
  
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    trivia = await Trivia.findOne({ id });
  } else if (mongoose.Types.ObjectId.isValid(id)) {
    // Fallback to MongoDB ObjectId for backward compatibility
    trivia = await Trivia.findById(id);
  }
  
  if (!trivia) return null;
  
  if (data.question !== undefined) trivia.question = data.question;
  if (data.ocId !== undefined) trivia.ocId = new mongoose.Types.ObjectId(data.ocId);
  
  await trivia.save();
  return await trivia.populate('ocId');
}

export async function deleteTrivia(id: string): Promise<boolean> {
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    const result = await Trivia.findOneAndDelete({ id });
    return !!result;
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    const result = await Trivia.findByIdAndDelete(id);
    return !!result;
  }
  return false;
}

