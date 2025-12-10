import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory (one level up from api directory)
// In Railway, environment variables are provided directly, but we still try to load .env for local dev
// Check if we're in Railway (has PORT env var) or if .env file exists
const envPath = path.resolve(process.cwd(), '../.env');
try {
  dotenv.config({ path: envPath });
} catch (error) {
  // In Railway, env vars are provided directly, so this is fine
  // dotenv.config() will use process.env if file doesn't exist
}

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import chalk from 'chalk';
import { connectDatabase } from './database/connection';
import authRoutes from './routes/auth';
import ocRoutes from './routes/ocs';
import qotdRoutes from './routes/qotd';
import promptRoutes from './routes/prompts';
import triviaRoutes from './routes/trivia';
import fandomRoutes from './routes/fandoms';
import birthdayRoutes from './routes/birthdays';
import cotwRoutes from './routes/cotw';
import statsRoutes from './routes/stats';
import configRoutes from './routes/config';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import { logger } from './utils/logger';

const app = express();
// Railway provides PORT environment variable, fallback to API_PORT or 5000
const PORT = Number(process.env.PORT) || Number(process.env.API_PORT) || 5000;

// Get dashboard URL based on environment
// Support multiple origins for CORS (Railway dashboard + local dev)
const getDashboardUrls = (): string[] => {
  const urls: string[] = [];
  
  if (process.env.DASHBOARD_URL_PROD) {
    urls.push(process.env.DASHBOARD_URL_PROD);
  }
  if (process.env.DASHBOARD_URL_DEV) {
    urls.push(process.env.DASHBOARD_URL_DEV);
  }
  if (process.env.NODE_ENV !== 'production') {
    urls.push('http://localhost:3000');
  }
  
  // Default fallback
  if (urls.length === 0) {
    urls.push('http://localhost:3000');
  }
  
  return urls;
};

const DASHBOARD_URLS = getDashboardUrls();
const DASHBOARD_URL = DASHBOARD_URLS[0]; // Primary URL for logging

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (DASHBOARD_URLS.some(url => origin === url || origin.startsWith(url))) {
      return callback(null, true);
    }
    
    // For Railway, also allow any Railway domain
    if (origin.includes('.railway.app') || origin.includes('.railway.tech')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

// Rate limiting - more lenient in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // Higher limit in development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.',
  // Add retry-after header
  handler: (req, res) => {
    const retryAfter = Math.ceil(15 * 60); // 15 minutes in seconds
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: retryAfter
    });
  }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ocs', ocRoutes);
app.use('/api/qotd', qotdRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/trivia', triviaRoutes);
app.use('/api/fandoms', fandomRoutes);
app.use('/api/birthdays', birthdayRoutes);
app.use('/api/cotw', cotwRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error: ${err.message || 'Internal server error'}`);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
  logger.showBanner();
  logger.showStartupInfo();
  
  try {
    logger.info('Connecting to database...');
    await connectDatabase();
    logger.success('Database connected successfully!');
    
    logger.info('Starting Express server...');
    app.listen(PORT, '0.0.0.0', () => {
      logger.success(`API server running on port ${chalk.cyan(PORT.toString())}`);
      logger.info(`Environment: ${chalk.cyan(process.env.NODE_ENV || 'development')}`);
      logger.info(`Dashboard URL: ${chalk.cyan(DASHBOARD_URL)}`);
      logger.info(`Allowed CORS origins: ${chalk.cyan(DASHBOARD_URLS.join(', '))}`);
      logger.info(`Health check: ${chalk.cyan(`http://0.0.0.0:${PORT}/health`)}`);
    });
  } catch (error) {
    logger.error('Failed to start API server:', error);
    process.exit(1);
  }
}

start();

export default app;
