import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';

// Load .env from root directory (one level up from api directory)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ociebot';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.success('API: Connected to MongoDB');
  } catch (error) {
    logger.error(`API: MongoDB connection error: ${error}`);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

