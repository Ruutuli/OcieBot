import mongoose, { Schema, Document } from 'mongoose';

export interface ITrivia extends Document {
  guildId: string;
  question: string;
  answer: string;
  category: 'OC Trivia' | 'Fandom Trivia' | 'Yume Trivia';
  ocId?: mongoose.Types.ObjectId; // Reference to OC if OC Trivia
  fandom?: string; // For Fandom Trivia
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

const TriviaSchema = new Schema<ITrivia>({
  guildId: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: {
    type: String,
    enum: ['OC Trivia', 'Fandom Trivia', 'Yume Trivia'],
    required: true
  },
  ocId: { type: Schema.Types.ObjectId, ref: 'OC' },
  fandom: String,
  createdById: { type: String, required: true }
}, {
  timestamps: true
});

TriviaSchema.index({ guildId: 1, category: 1 });
TriviaSchema.index({ ocId: 1 });

export const Trivia = mongoose.model<ITrivia>('Trivia', TriviaSchema);

