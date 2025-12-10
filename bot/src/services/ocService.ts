import { OC, IOC } from '../database/models/OC';
import mongoose from 'mongoose';

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
  const oc = new OC(data);
  return await oc.save();
}

export async function getOCById(id: string): Promise<IOC | null> {
  return await OC.findById(id);
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
  return await OC.findByIdAndUpdate(id, updates, { new: true });
}

export async function deleteOC(id: string): Promise<boolean> {
  const result = await OC.findByIdAndDelete(id);
  return !!result;
}

export async function addPlaylistSong(ocId: string, songLink: string): Promise<IOC | null> {
  const oc = await OC.findById(ocId);
  if (!oc) return null;
  if (!oc.playlist.includes(songLink)) {
    oc.playlist.push(songLink);
    await oc.save();
  }
  return oc;
}

export async function removePlaylistSong(ocId: string, songLink: string): Promise<IOC | null> {
  const oc = await OC.findById(ocId);
  if (!oc) return null;
  oc.playlist = oc.playlist.filter(link => link !== songLink);
  await oc.save();
  return oc;
}

export async function addNote(ocId: string, note: string): Promise<IOC | null> {
  const oc = await OC.findById(ocId);
  if (!oc) return null;
  oc.notes.push(note);
  await oc.save();
  return oc;
}

