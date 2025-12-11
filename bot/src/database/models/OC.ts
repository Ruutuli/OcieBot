import mongoose, { Schema, Document } from 'mongoose';

export interface IYumeInfo {
  foName?: string;
  foSource?: string;
  relationshipType?: string;
  tags?: string[];
  link?: string;
  foImageUrl?: string; // External image URL for F/O (user-hosted)
}

export interface IOC extends Document {
  id: string; // Custom ID in format O12345
  name: string;
  ownerId: string;
  guildId: string;
  fandoms: string[]; // Array of fandoms (multi-fandom support)
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
  link: String,
  foImageUrl: String // External image URL for F/O (user-hosted)
}, { _id: false });

const OCSchema = new Schema<IOC>({
  id: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
  guildId: { type: String, required: true },
  fandoms: { type: [String], default: [] },
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

// Migration hook: Convert old fandom field to fandoms array
OCSchema.pre('save', function(next) {
  const doc = this as any;
  // If fandoms is empty or undefined, and old fandom field exists, migrate it
  if ((!doc.fandoms || doc.fandoms.length === 0) && doc.fandom && typeof doc.fandom === 'string') {
    doc.fandoms = [doc.fandom];
    // Optionally remove old field (or keep it for now)
    // delete doc.fandom;
  }
  next();
});

// Index for efficient queries
// Note: id field already has unique: true which creates an index automatically
OCSchema.index({ guildId: 1, ownerId: 1 });
OCSchema.index({ guildId: 1, fandoms: 1 });
OCSchema.index({ guildId: 1, name: 1 });

export const OC = mongoose.model<IOC>('OC', OCSchema);

