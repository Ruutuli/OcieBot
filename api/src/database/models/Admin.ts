import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  userId: string;
  addedBy: string; // User ID of the admin who added this admin
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  userId: { type: String, required: true, unique: true },
  addedBy: { type: String, required: true }
}, {
  timestamps: true
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);

