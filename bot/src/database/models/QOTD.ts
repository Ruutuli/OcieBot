import mongoose, { Schema, Document } from 'mongoose';

export interface IQOTD extends Document {
  id: string; // Custom ID in format A12345
  guildId: string;
  question: string;
  category: 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc';
  fandom?: string;
  createdById: string;
  timesUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const QOTDSchema = new Schema<IQOTD>({
  id: { type: String, unique: true, sparse: true },
  guildId: { type: String, required: true },
  question: { type: String, required: true },
  category: {
    type: String,
    enum: ['OC General', 'Worldbuilding', 'Yume', 'Misc'],
    default: 'Misc'
  },
  fandom: { type: String, required: false },
  createdById: { type: String, required: true },
  timesUsed: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Note: id field already has unique: true which creates an index automatically
QOTDSchema.index({ guildId: 1, category: 1 });
QOTDSchema.index({ guildId: 1, fandom: 1 });

export const QOTD = mongoose.model<IQOTD>('QOTD', QOTDSchema);

