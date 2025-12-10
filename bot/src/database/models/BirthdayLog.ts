import mongoose, { Schema, Document } from 'mongoose';

export interface IBirthdayLog extends Document {
  guildId: string;
  ocId: mongoose.Types.ObjectId;
  channelId: string;
  date: Date; // The birthday date (MM-DD)
  yearAnnounced: number; // The year it was announced
  createdAt: Date;
}

const BirthdayLogSchema = new Schema<IBirthdayLog>({
  guildId: { type: String, required: true },
  ocId: { type: Schema.Types.ObjectId, ref: 'OC', required: true },
  channelId: { type: String, required: true },
  date: { type: Date, required: true },
  yearAnnounced: { type: Number, required: true }
}, {
  timestamps: true
});

BirthdayLogSchema.index({ guildId: 1, date: 1, yearAnnounced: 1 });
BirthdayLogSchema.index({ ocId: 1, yearAnnounced: 1 });

export const BirthdayLog = mongoose.model<IBirthdayLog>('BirthdayLog', BirthdayLogSchema);

