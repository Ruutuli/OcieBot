import express, { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import jwt from 'jsonwebtoken';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ServerConfig } from '../database/models/ServerConfig';

const router = express.Router();

// Configure Discord OAuth
const clientID = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;
const callbackURL = process.env.DISCORD_REDIRECT_URI;

if (!clientID || !clientSecret || !callbackURL) {
  logger.warn('Discord OAuth not configured. Missing DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, or DISCORD_REDIRECT_URI in .env');
} else {
  passport.use(new DiscordStrategy({
    clientID,
    clientSecret,
    callbackURL,
    scope: ['identify', 'guilds']
  }, (accessToken, refreshToken, profile, done) => {
    // Store access token in profile for later use
    (profile as any).accessToken = accessToken;
    (profile as any).refreshToken = refreshToken;
    return done(null, profile);
  }));
}

// OAuth routes
router.get('/discord', (req, res, next) => {
  // Store the origin in query parameter to pass through OAuth flow
  // This will be available in req.query.state after Discord redirects back
  passport.authenticate('discord', { 
    state: req.query.origin ? Buffer.from(req.query.origin as string).toString('base64') : undefined 
  })(req, res, next);
});

router.get('/callback', passport.authenticate('discord', { session: false }), (req, res) => {
  const user = req.user as any;
  const jwtSecret = process.env.JWT_SECRET!;
  
  // Store access token in JWT (will be used to fetch user's guilds)
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      accessToken: user.accessToken // Store for fetching guilds
    },
    jwtSecret,
    { expiresIn: '7d' }
  );

  // Get dashboard URL - prioritize production URL if set, otherwise check state/origin
  let dashboardUrl: string;
  
  // First, check if production URL is explicitly set (Railway)
  if (process.env.DASHBOARD_URL_PROD) {
    dashboardUrl = process.env.DASHBOARD_URL_PROD;
  } else {
    // Fallback: try to decode origin from state
    const state = req.query.state as string;
    if (state) {
      try {
        const decodedOrigin = Buffer.from(state, 'base64').toString('utf-8');
        const urlObj = new URL(decodedOrigin);
        dashboardUrl = `${urlObj.protocol}//${urlObj.host}`;
      } catch (e) {
        // Fallback to localhost for development
        dashboardUrl = 'http://localhost:3000';
      }
    } else {
      // Fallback to localhost for development
      dashboardUrl = 'http://localhost:3000';
    }
  }
  
  // Railway deployments use root path
  res.redirect(`${dashboardUrl}/auth/callback?token=${token}`);
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({ user: authReq.user });
});

router.get('/guilds', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const accessToken = authReq.user?.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token not available. Please re-authenticate.' });
  }

  try {
    // Fetch user's guilds from Discord API
    const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!discordResponse.ok) {
      throw new Error('Failed to fetch guilds from Discord');
    }

    const userGuilds = await discordResponse.json() as Array<{
      id: string;
      name: string;
      icon?: string;
      owner: boolean;
      permissions: string;
    }>;

    // Get list of guilds where bot is present (from ServerConfig)
    const botGuilds = await ServerConfig.find({}).select('guildId').lean();
    const botGuildIds = new Set(botGuilds.map(g => g.guildId));

    // Filter to only show guilds where user is member AND bot is present
    const availableGuilds = userGuilds
      .filter((guild: any) => botGuildIds.has(guild.id))
      .map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
        permissions: guild.permissions
      }));

    res.json(availableGuilds);
  } catch (error: any) {
    logger.error(`Error fetching user guilds: ${error}`);
    res.status(500).json({ error: error.message || 'Failed to fetch guilds' });
  }
});

export default router;

