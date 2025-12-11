import express, { Request, Response } from 'express';
import { ServerConfig } from '../database/models/ServerConfig';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    let config = await ServerConfig.findOne({ guildId });
    if (!config) {
      config = new ServerConfig({ guildId });
      await config.save();
    }

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId, channels, features, schedules, timezone } = req.body;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    let config = await ServerConfig.findOne({ guildId });
    if (!config) {
      config = new ServerConfig({ guildId });
    }

    // Update nested objects explicitly to ensure Mongoose tracks changes
    if (channels !== undefined) {
      // Merge with existing channels and convert empty strings to undefined
      const updatedChannels = { ...(config.channels || {}) };
      for (const [key, value] of Object.entries(channels)) {
        // Convert empty strings to undefined (when channel is cleared)
        updatedChannels[key as keyof typeof updatedChannels] = (value && value !== '') ? value : undefined;
      }
      config.channels = updatedChannels;
      config.markModified('channels');
    }

    if (features !== undefined) {
      config.features = {
        ...(config.features || {}),
        ...features
      };
      config.markModified('features');
    }

    if (schedules !== undefined) {
      config.schedules = {
        ...(config.schedules || {}),
        ...schedules
      };
      config.markModified('schedules');
    }

    if (timezone !== undefined) {
      config.timezone = timezone;
    }

    await config.save();

    res.json(config);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/servers', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const servers = await ServerConfig.find({}).select('guildId createdAt').sort({ createdAt: -1 });
    res.json(servers.map(s => ({ guildId: s.guildId, createdAt: s.createdAt })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/channels', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Fetch channels from Discord API
    const discordResponse = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    });

    if (!discordResponse.ok) {
      throw new Error('Failed to fetch channels from Discord');
    }

    const channels = await discordResponse.json() as Array<{
      id: string;
      name: string;
      type: number;
      position: number;
    }>;
    
    // Filter to only text channels and sort by position/name
    const textChannels = channels
      .filter((channel: any) => channel.type === 0) // Text channels only
      .sort((a: any, b: any) => {
        // Sort by position first, then by name
        if (a.position !== b.position) {
          return a.position - b.position;
        }
        return a.name.localeCompare(b.name);
      })
      .map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type
      }));

    res.json(textChannels);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch channels' });
  }
});

router.get('/roles', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Fetch roles from Discord API
    const discordResponse = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    });

    if (!discordResponse.ok) {
      throw new Error('Failed to fetch roles from Discord');
    }

    const roles = await discordResponse.json() as Array<{
      id: string;
      name: string;
      position: number;
    }>;
    
    // Filter out @everyone role and sort by position (higher position first)
    const filteredRoles = roles
      .filter((role: any) => role.id !== guildId) // Exclude @everyone
      .sort((a: any, b: any) => {
        // Sort by position (descending - higher position first)
        return b.position - a.position;
      })
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position
      }));

    res.json(filteredRoles);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch roles' });
  }
});

router.post('/roles', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId, name, color } = req.body;
    if (!guildId || !name) {
      return res.status(400).json({ error: 'guildId and name are required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Create role via Discord API
    const discordResponse = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name.trim(),
        color: color || 0, // Default to no color if not provided
        mentionable: false,
        hoist: false
      })
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({})) as { message?: string };
      throw new Error(errorData.message || 'Failed to create role in Discord');
    }

    const role = await discordResponse.json() as {
      id: string;
      name: string;
      color: number;
      position: number;
    };
    
    res.json({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create role' });
  }
});

export default router;

