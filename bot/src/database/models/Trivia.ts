import mongoose, { Schema, Document } from 'mongoose';

export interface ITrivia extends Document {
  id: string; // Custom ID in format A12345
  guildId: string;
  question: string; // The trivia question
  ocId: mongoose.Types.ObjectId; // Reference to OC (the answer)
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

const TriviaSchema = new Schema<ITrivia>({
  id: { type: String, unique: true, sparse: true },
  guildId: { type: String, required: true },
  question: { type: String, required: true },
  ocId: { type: Schema.Types.ObjectId, ref: 'OC', required: true },
  createdById: { type: String, required: true }
}, {
  timestamps: true
});

// Note: id field already has unique: true which creates an index automatically
TriviaSchema.index({ guildId: 1 });
TriviaSchema.index({ ocId: 1 });

export const Trivia = mongoose.model<ITrivia>('Trivia', TriviaSchema);

