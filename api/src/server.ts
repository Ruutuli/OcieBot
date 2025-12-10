import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory (one level up from api directory)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

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
const PORT = process.env.API_PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
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
    app.listen(PORT, () => {
      logger.success(`API server running on port ${chalk.cyan(PORT.toString())}`);
      logger.info(`Dashboard URL: ${chalk.cyan(process.env.DASHBOARD_URL || 'http://localhost:3000')}`);
      logger.info(`Health check: ${chalk.cyan(`http://localhost:${PORT}/health`)}`);
    });
  } catch (error) {
    logger.error('Failed to start API server:', error);
    process.exit(1);
  }
}

start();

export default app;
