import mongoose, { Schema, Document } from 'mongoose';

export interface IFandom extends Document {
  name: string;
  guildId: string;
  imageUrl?: string; // Logo/image URL for the fandom
  createdAt: Date;
  updatedAt: Date;
}

const FandomSchema = new Schema<IFandom>({
  name: { type: String, required: true },
  guildId: { type: String, required: true },
  imageUrl: { type: String }
}, {
  timestamps: true
});

// Compound index to ensure unique fandom names per guild
FandomSchema.index({ name: 1, guildId: 1 }, { unique: true });

export const Fandom = mongoose.model<IFandom>('Fandom', FandomSchema);

