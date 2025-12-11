import mongoose, { Schema, Document } from 'mongoose';

export interface IYumeInfo {
  foName?: string;
  foSource?: string;
  relationshipType?: string;
  tags?: string[];
  link?: string;
}

export interface IOC extends Document {
  id: string; // Custom ID in format O12345
  name: string;
  ownerId: string;
  guildId: string;
  fandom: string;
  age?: string;
  race?: string;
  gender?: string;
  birthday?: string; // MM-DD format
  bioLink?: string;
  imageUrl?: string; // External image URL (user-hosted)
  yume?: IYumeInfo;
  playlist: string[];
  notes: string[];
  triviaQuestions: string[]; // References to Trivia documents
  createdAt: Date;
  updatedAt: Date;
}

const YumeInfoSchema = new Schema<IYumeInfo>({
  foName: String,
  foSource: String,
  relationshipType: String,
  tags: [String],
  link: String
}, { _id: false });

const OCSchema = new Schema<IOC>({
  id: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
  guildId: { type: String, required: true },
  fandom: { type: String, required: true },
  age: String,
  race: String,
  gender: String,
  birthday: String, // MM-DD format
  bioLink: String,
  imageUrl: String, // External image URL (user-hosted)
  yume: YumeInfoSchema,
  playlist: { type: [String], default: [] },
  notes: { type: [String], default: [] },
  triviaQuestions: [{ type: Schema.Types.ObjectId, ref: 'Trivia' }]
}, {
  timestamps: true
});

// Index for efficient queries
// Note: id field already has unique: true which creates an index automatically
OCSchema.index({ guildId: 1, ownerId: 1 });
OCSchema.index({ guildId: 1, fandom: 1 });
OCSchema.index({ guildId: 1, name: 1 });

export const OC = mongoose.model<IOC>('OC', OCSchema);

