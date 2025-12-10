import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';

// Load .env from root directory (one level up from api directory)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ociebot';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // Exponential backoff: 2s, 4s, 8s

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    // Check for IP whitelisting issues
    if (errorMessage.includes('ip') && errorMessage.includes('whitelist')) {
      return `MongoDB Atlas IP Whitelisting Error: Your current IP address is not whitelisted in MongoDB Atlas Network Access settings.\n` +
             `For Railway deployments, you need to:\n` +
             `1. Go to MongoDB Atlas → Network Access\n` +
             `2. Click "Add IP Address"\n` +
             `3. Select "Allow Access from Anywhere" (0.0.0.0/0) for Railway's dynamic IPs\n` +
             `4. Or add Railway's specific IP ranges if known\n` +
             `Original error: ${error.message}`;
    }
    
    // Check for server selection errors
    if (errorMessage.includes('server selection') || errorMessage.includes('could not connect')) {
      return `MongoDB Connection Error: Could not connect to MongoDB Atlas cluster.\n` +
             `Common causes:\n` +
             `- IP address not whitelisted in MongoDB Atlas Network Access\n` +
             `- Incorrect connection string (check MONGODB_URI environment variable)\n` +
             `- Network connectivity issues\n` +
             `Original error: ${error.message}`;
    }
    
    return error.message;
  }
  return String(error);
}

export async function connectDatabase(): Promise<void> {
  const connectionOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, connectionOptions);
      logger.success('API: Connected to MongoDB');
      return;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      if (attempt === MAX_RETRIES - 1) {
        // Last attempt failed
        logger.error(`API: MongoDB connection error (failed after ${MAX_RETRIES} attempts): ${errorMessage}`);
        process.exit(1);
      } else {
        // Retry with delay
        const delay = RETRY_DELAYS[attempt];
        logger.error(`API: MongoDB connection error (attempt ${attempt + 1}/${MAX_RETRIES}): ${errorMessage}`);
        logger.info(`API: Retrying MongoDB connection in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

