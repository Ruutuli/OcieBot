import { OC, IOC } from '../database/models/OC';
import mongoose from 'mongoose';
import { generateCustomId, isValidCustomId } from '../utils/idGenerator';

export async function createOC(data: {
  name: string;
  ownerId: string;
  guildId: string;
  fandom: string;
  age?: string;
  race?: string;
  gender?: string;
  birthday?: string;
  bioLink?: string;
  imageUrl?: string;
  yume?: {
    foName?: string;
    foSource?: string;
    relationshipType?: string;
  };
}): Promise<IOC> {
  const id = await generateCustomId('O', OC);
  const oc = new OC({ ...data, id });
  return await oc.save();
}

export async function getOCById(id: string): Promise<IOC | null> {
  // Try custom ID format first (O12345)
  if (isValidCustomId(id)) {
    return await OC.findOne({ id });
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    return await OC.findById(id);
  }
  return null;
}

export async function getOCByName(guildId: string, name: string): Promise<IOC | null> {
  return await OC.findOne({ guildId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
}

export async function getOCsByOwner(guildId: string, ownerId: string): Promise<IOC[]> {
  return await OC.find({ guildId, ownerId });
}

export async function getOCsByFandom(guildId: string, fandom: string): Promise<IOC[]> {
  return await OC.find({ guildId, fandom: { $regex: new RegExp(fandom, 'i') } });
}

export async function searchOCs(guildId: string, searchTerm: string): Promise<IOC[]> {
  return await OC.find({
    guildId,
    $or: [
      { name: { $regex: new RegExp(searchTerm, 'i') } },
      { fandom: { $regex: new RegExp(searchTerm, 'i') } },
      { age: { $regex: new RegExp(searchTerm, 'i') } },
      { race: { $regex: new RegExp(searchTerm, 'i') } }
    ]
  });
}

export async function getRandomOC(guildId: string): Promise<IOC | null> {
  const count = await OC.countDocuments({ guildId });
  if (count === 0) return null;
  const random = Math.floor(Math.random() * count);
  const ocs = await OC.find({ guildId }).skip(random).limit(1);
  return ocs[0] || null;
}

export async function getAllOCs(guildId: string): Promise<IOC[]> {
  return await OC.find({ guildId });
}

export async function updateOC(id: string, updates: Partial<IOC>): Promise<IOC | null> {
  // Try custom ID format first (O12345)
  if (isValidCustomId(id)) {
    return await OC.findOneAndUpdate({ id }, updates, { new: true });
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    return await OC.findByIdAndUpdate(id, updates, { new: true });
  }
  return null;
}

export async function deleteOC(id: string): Promise<boolean> {
  // Try custom ID format first (O12345)
  if (isValidCustomId(id)) {
    const result = await OC.findOneAndDelete({ id });
    return !!result;
  }
  // Fallback to MongoDB ObjectId for backward compatibility
  if (mongoose.Types.ObjectId.isValid(id)) {
    const result = await OC.findByIdAndDelete(id);
    return !!result;
  }
  return false;
}

export async function addPlaylistSong(ocId: string, songLink: string): Promise<IOC | null> {
  const oc = await getOCById(ocId);
  if (!oc) return null;
  if (!oc.playlist.includes(songLink)) {
    oc.playlist.push(songLink);
    await oc.save();
  }
  return oc;
}

export async function removePlaylistSong(ocId: string, songLink: string): Promise<IOC | null> {
  const oc = await getOCById(ocId);
  if (!oc) return null;
  oc.playlist = oc.playlist.filter(link => link !== songLink);
  await oc.save();
  return oc;
}

export async function addNote(ocId: string, note: string): Promise<IOC | null> {
  const oc = await getOCById(ocId);
  if (!oc) return null;
  oc.notes.push(note);
  await oc.save();
  return oc;
}

export async function getUniqueFandoms(guildId: string): Promise<string[]> {
  const fandoms = await OC.distinct('fandom', { guildId });
  return fandoms.filter(f => f && f.trim().length > 0).sort();
}

