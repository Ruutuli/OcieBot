import { QOTD, IQOTD } from '../database/models/QOTD';
import mongoose from 'mongoose';
import { generateCustomId, isValidCustomId } from '../utils/idGenerator';

export async function getQOTDById(id: string): Promise<IQOTD | null> {
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    return await QOTD.findOne({ id });
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    return await QOTD.findById(id);
  }
  return null;
}

export async function createQOTD(data: {
  guildId: string;
  question: string;
  category: 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc';
  createdById: string;
  fandom?: string;
}): Promise<IQOTD> {
  const id = await generateCustomId('Q', QOTD);
  const qotd = new QOTD({ ...data, id });
  return await qotd.save();
}

export async function getQOTDsByGuild(guildId: string, category?: string): Promise<IQOTD[]> {
  const query: any = { guildId };
  if (category) {
    query.category = category;
  }
  return await QOTD.find(query).sort({ createdAt: -1 });
}

export async function getRandomQOTD(guildId: string, category?: string): Promise<IQOTD | null> {
  const query: any = { guildId };
  if (category) {
    query.category = category;
  }
  const count = await QOTD.countDocuments(query);
  if (count === 0) return null;
  const random = Math.floor(Math.random() * count);
  const qotds = await QOTD.find(query).skip(random).limit(1);
  return qotds[0] || null;
}

export async function deleteQOTD(id: string): Promise<boolean> {
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    const result = await QOTD.findOneAndDelete({ id });
    return !!result;
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    const result = await QOTD.findByIdAndDelete(id);
    return !!result;
  }
  return false;
}

export async function incrementQOTDUse(id: string): Promise<void> {
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    await QOTD.findOneAndUpdate({ id }, { $inc: { timesUsed: 1 } });
    return;
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    await QOTD.findByIdAndUpdate(id, { $inc: { timesUsed: 1 } });
  }
}

export async function updateQOTD(id: string, data: {
  question?: string;
  category?: 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc';
  fandom?: string | null;
}): Promise<IQOTD> {
  let qotd: IQOTD | null = null;
  
  // Try custom ID format first (A12345)
  if (isValidCustomId(id)) {
    qotd = await QOTD.findOne({ id });
  } else if (mongoose.Types.ObjectId.isValid(id)) {
    // Fallback to MongoDB ObjectId for backward compatibility
    qotd = await QOTD.findById(id);
  }
  
  if (!qotd) {
    throw new Error('QOTD not found');
  }

  if (data.question !== undefined) {
    qotd.question = data.question;
  }
  if (data.category !== undefined) {
    qotd.category = data.category;
  }
  if (data.fandom !== undefined) {
    qotd.fandom = data.fandom || undefined;
  }

  return await qotd.save();
}
