import { Prompt, IPrompt } from '../database/models/Prompt';
import mongoose from 'mongoose';

export async function getPromptById(id: string): Promise<IPrompt | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Prompt.findById(id);
}

export async function createPrompt(data: {
  guildId: string;
  text: string;
  category: 'General' | 'RP' | 'Worldbuilding' | 'Misc';
  createdById: string;
}): Promise<IPrompt> {
  const prompt = new Prompt(data);
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

export async function deletePrompt(id: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const result = await Prompt.findByIdAndDelete(id);
  return !!result;
}

