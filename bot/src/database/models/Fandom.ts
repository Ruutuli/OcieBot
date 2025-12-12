import mongoose, { Schema, Document } from 'mongoose';

export interface IFandom extends Document {
  name: string;
  guildId: string;
  imageUrl?: string; // Logo/image URL for the fandom
  color?: string; // Hex color code for the fandom
  createdAt: Date;
  updatedAt: Date;
}

const FandomSchema = new Schema<IFandom>({
  name: { type: String, required: true },
  guildId: { type: String, required: true },
  imageUrl: { type: String },
  color: { type: String } // Hex color code (e.g., "#FF5733")
}, {
  timestamps: true
});

// Compound index to ensure unique fandom names per guild
FandomSchema.index({ name: 1, guildId: 1 }, { unique: true });

export const Fandom = mongoose.model<IFandom>('Fandom', FandomSchema);

