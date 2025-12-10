import mongoose, { Schema, Document } from 'mongoose';

export interface ITrivia extends Document {
  guildId: string;
  fact: string; // The trivia fact about the OC
  ocId: mongoose.Types.ObjectId; // Reference to OC (required)
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

const TriviaSchema = new Schema<ITrivia>({
  guildId: { type: String, required: true },
  fact: { type: String, required: true },
  ocId: { type: Schema.Types.ObjectId, ref: 'OC', required: true },
  createdById: { type: String, required: true }
}, {
  timestamps: true
});

TriviaSchema.index({ guildId: 1 });
TriviaSchema.index({ ocId: 1 });

export const Trivia = mongoose.model<ITrivia>('Trivia', TriviaSchema);

