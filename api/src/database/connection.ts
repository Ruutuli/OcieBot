import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';

// Load .env from root directory (one level up from api directory)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// Get MongoDB URI and remove any database name from it
// We'll explicitly set the database name in connection options
const rawMongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ociebot';

// CRITICAL: Block "test" database in URI
if (rawMongoUri.includes('/test') || rawMongoUri.includes('/test?')) {
  throw new Error('BLOCKED: MONGODB_URI contains "test" database. This is not allowed. Use "ociebot" database only.');
}

// Remove database name from URI if present (everything after the last / before ?)
// This handles formats like: mongodb://host/dbname or mongodb://host/dbname?options
const MONGODB_URI = (() => {
  const queryIndex = rawMongoUri.indexOf('?');
  const uriWithoutQuery = queryIndex >= 0 ? rawMongoUri.substring(0, queryIndex) : rawMongoUri;
  const queryString = queryIndex >= 0 ? rawMongoUri.substring(queryIndex) : '';
  
  // Find the last / that's not part of ://
  const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
  const protocolIndex = uriWithoutQuery.indexOf('://');
  
  if (lastSlashIndex > protocolIndex + 2) {
    // There's a database name, remove it (we'll set it explicitly to 'ociebot')
    return uriWithoutQuery.substring(0, lastSlashIndex) + queryString;
  }
  
  return rawMongoUri; // No database name to remove
})();

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
  // CRITICAL: Always use 'ociebot' database, NEVER 'test' regardless of NODE_ENV
  const DB_NAME = 'ociebot';
  
  // Block any attempt to use 'test' database
  if (process.env.NODE_ENV === 'test' || process.env.MONGODB_DB_NAME === 'test') {
    logger.error('BLOCKED: Attempt to use "test" database detected. Forcing "ociebot" database.');
  }
  
  // If already connected, check database name and disconnect if wrong
  if (mongoose.connection.readyState === 1) {
    const currentDbName = mongoose.connection.db?.databaseName;
    if (currentDbName !== DB_NAME) {
      logger.warn(`Disconnecting from incorrect database "${currentDbName}" to reconnect to "${DB_NAME}"`);
      await mongoose.disconnect();
    } else {
      logger.info(`Already connected to correct database "${DB_NAME}"`);
      return;
    }
  }
  
  const connectionOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    dbName: DB_NAME, // ALWAYS 'ociebot', never 'test'
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, connectionOptions);
      
      // Verify we're connected to the correct database
      const actualDbName = mongoose.connection.db?.databaseName;
      if (actualDbName !== DB_NAME) {
        logger.error(`CRITICAL ERROR: Connected to wrong database "${actualDbName}" instead of "${DB_NAME}". Disconnecting...`);
        await mongoose.disconnect();
        throw new Error(`Database name mismatch: expected "${DB_NAME}" but got "${actualDbName}"`);
      }
      
      logger.success(`API: Connected to MongoDB database "${DB_NAME}"`);
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

