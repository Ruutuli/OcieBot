import { QOTD, IQOTD } from '../database/models/QOTD';
import mongoose from 'mongoose';

export async function getQOTDById(id: string): Promise<IQOTD | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await QOTD.findById(id);
}

export async function createQOTD(data: {
  guildId: string;
  question: string;
  category: 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc';
  createdById: string;
  fandom?: string;
}): Promise<IQOTD> {
  const qotd = new QOTD(data);
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
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const result = await QOTD.findByIdAndDelete(id);
  return !!result;
}

export async function incrementQOTDUse(id: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) return;
  await QOTD.findByIdAndUpdate(id, { $inc: { timesUsed: 1 } });
}

export async function updateQOTD(id: string, data: {
  question?: string;
  category?: 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc';
  fandom?: string | null;
}): Promise<IQOTD> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid QOTD ID');
  }
  
  const qotd = await QOTD.findById(id);
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
