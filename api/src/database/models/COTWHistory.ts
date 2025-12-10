import mongoose, { Schema, Document } from 'mongoose';

export interface ICOTWHistory extends Document {
  guildId: string;
  ocId: mongoose.Types.ObjectId;
  channelId: string;
  date: Date;
  createdAt: Date;
}

const COTWHistorySchema = new Schema<ICOTWHistory>({
  guildId: { type: String, required: true },
  ocId: { type: Schema.Types.ObjectId, ref: 'OC', required: true },
  channelId: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true
});

COTWHistorySchema.index({ guildId: 1, date: -1 });
COTWHistorySchema.index({ ocId: 1 });

export const COTWHistory = mongoose.model<ICOTWHistory>('COTWHistory', COTWHistorySchema);

