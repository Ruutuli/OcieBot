import mongoose, { Schema, Document } from 'mongoose';

export interface IQOTDAnswer extends Document {
  qotdId: mongoose.Types.ObjectId | string;
  userId: string;
  ocId?: mongoose.Types.ObjectId | string;
  response: string;
  guildId: string;
  createdAt: Date;
  updatedAt: Date;
}

const QOTDAnswerSchema = new Schema<IQOTDAnswer>({
  qotdId: { type: Schema.Types.ObjectId, ref: 'QOTD', required: true },
  userId: { type: String, required: true },
  ocId: { type: Schema.Types.ObjectId, ref: 'OC', required: false },
  response: { type: String, required: true },
  guildId: { type: String, required: true }
}, {
  timestamps: true
});

// Indexes for efficient queries
QOTDAnswerSchema.index({ qotdId: 1 });
QOTDAnswerSchema.index({ userId: 1 });
QOTDAnswerSchema.index({ guildId: 1 });
QOTDAnswerSchema.index({ ocId: 1 });
QOTDAnswerSchema.index({ qotdId: 1, userId: 1 }); // Unique constraint for one answer per user per QOTD (optional, can be removed if multiple answers allowed)

export const QOTDAnswer = mongoose.model<IQOTDAnswer>('QOTDAnswer', QOTDAnswerSchema);

