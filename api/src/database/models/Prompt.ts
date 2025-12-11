import mongoose, { Schema, Document } from 'mongoose';

export interface IPrompt extends Document {
  id: string; // Custom ID in format A12345
  guildId: string;
  text: string;
  category: 'General' | 'RP' | 'Worldbuilding' | 'Misc';
  fandom?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromptSchema = new Schema<IPrompt>({
  id: { type: String, unique: true, sparse: true },
  guildId: { type: String, required: true },
  text: { type: String, required: true },
  category: {
    type: String,
    enum: ['General', 'RP', 'Worldbuilding', 'Misc'],
    default: 'General'
  },
  fandom: { type: String, required: false },
  createdById: { type: String, required: true }
}, {
  timestamps: true
});

// Note: id field already has unique: true which creates an index automatically
PromptSchema.index({ guildId: 1, category: 1 });
PromptSchema.index({ guildId: 1, fandom: 1 });

export const Prompt = mongoose.model<IPrompt>('Prompt', PromptSchema);

