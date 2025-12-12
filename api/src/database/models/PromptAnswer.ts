import mongoose, { Schema, Document } from 'mongoose';

export interface IPromptAnswer extends Document {
  promptId: mongoose.Types.ObjectId | string;
  userId: string;
  ocId?: mongoose.Types.ObjectId | string;
  response: string;
  guildId: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromptAnswerSchema = new Schema<IPromptAnswer>({
  promptId: { type: Schema.Types.ObjectId, ref: 'Prompt', required: true },
  userId: { type: String, required: true },
  ocId: { type: Schema.Types.ObjectId, ref: 'OC', required: false },
  response: { type: String, required: true },
  guildId: { type: String, required: true }
}, {
  timestamps: true
});

// Indexes for efficient queries
PromptAnswerSchema.index({ promptId: 1 });
PromptAnswerSchema.index({ userId: 1 });
PromptAnswerSchema.index({ guildId: 1 });
PromptAnswerSchema.index({ ocId: 1 });
PromptAnswerSchema.index({ promptId: 1, userId: 1 }); // Unique constraint for one answer per user per prompt (optional, can be removed if multiple answers allowed)

export const PromptAnswer = mongoose.model<IPromptAnswer>('PromptAnswer', PromptAnswerSchema);

