import { Prompt, IPrompt } from '../database/models/Prompt';
import mongoose from 'mongoose';
import { generateCustomId, isValidCustomId } from '../utils/idGenerator';

export async function getPromptById(id: string): Promise<IPrompt | null> {
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    return await Prompt.findOne({ id });
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    return await Prompt.findById(id);
  }
  return null;
}

export async function createPrompt(data: {
  guildId: string;
  text: string;
  category: 'General' | 'RP' | 'Worldbuilding' | 'Misc';
  createdById: string;
  fandom?: string;
}): Promise<IPrompt> {
  const id = await generateCustomId('P', Prompt);
  const prompt = new Prompt({ ...data, id });
  return await prompt.save();
}

export async function getPromptsByGuild(guildId: string, category?: string): Promise<IPrompt[]> {
  const query: any = { guildId };
  if (category) {
    query.category = category;
  }
  return await Prompt.find(query).sort({ createdAt: -1 });
}

export async function getRandomPrompt(guildId: string, category?: string): Promise<IPrompt | null> {
  const query: any = { guildId };
  if (category) {
    query.category = category;
  }
  const count = await Prompt.countDocuments(query);
  if (count === 0) return null;
  const random = Math.floor(Math.random() * count);
  const prompts = await Prompt.find(query).skip(random).limit(1);
  return prompts[0] || null;
}

export async function updatePrompt(id: string, data: {
  text?: string;
  category?: 'General' | 'RP' | 'Worldbuilding' | 'Misc';
  fandom?: string | null;
}): Promise<IPrompt> {
  let prompt: IPrompt | null = null;
  
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    prompt = await Prompt.findOne({ id });
  } else if (mongoose.Types.ObjectId.isValid(id)) {
    // Fallback to MongoDB ObjectId for backward compatibility
    prompt = await Prompt.findById(id);
  }
  
  if (!prompt) {
    throw new Error('Prompt not found');
  }

  if (data.text !== undefined) {
    prompt.text = data.text;
  }
  if (data.category !== undefined) {
    prompt.category = data.category;
  }
  if (data.fandom !== undefined) {
    prompt.fandom = data.fandom || undefined;
  }

  return await prompt.save();
}

export async function deletePrompt(id: string): Promise<boolean> {
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    const result = await Prompt.findOneAndDelete({ id });
    return !!result;
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    const result = await Prompt.findByIdAndDelete(id);
    return !!result;
  }
  return false;
}

