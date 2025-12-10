import express, { Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get user info from Discord (supports multiple user IDs)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { userIds, guildId } = req.query;
    
    if (!userIds) {
      return res.status(400).json({ error: 'userIds is required (comma-separated)' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const userIdArray = (userIds as string).split(',').map(id => id.trim()).filter(Boolean);
    
    // If guildId is provided, try to fetch from guild members first (more reliable)
    if (guildId) {
      try {
        const guildResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members?limit=1000`, {
          headers: {
            'Authorization': `Bot ${botToken}`
          }
        });

        if (guildResponse.ok) {
          const members = await guildResponse.json() as Array<{
            user: {
              id: string;
              username: string;
              discriminator: string;
              global_name?: string;
              avatar?: string;
            };
          }>;
          const memberMap = new Map();
          
          members.forEach((member) => {
            if (userIdArray.includes(member.user.id)) {
              memberMap.set(member.user.id, {
                id: member.user.id,
                username: member.user.username,
                discriminator: member.user.discriminator,
                globalName: member.user.global_name || member.user.username,
                avatar: member.user.avatar
              });
            }
          });

          // For any missing users, fetch individually
          const missingIds = userIdArray.filter(id => !memberMap.has(id));
          const userInfoPromises = missingIds.map(async (userId) => {
            try {
              const userResponse = await fetch(`https://discord.com/api/users/${userId}`, {
                headers: {
                  'Authorization': `Bot ${botToken}`
                }
              });

              if (userResponse.ok) {
                const user = await userResponse.json() as {
                  id: string;
                  username: string;
                  discriminator: string;
                  global_name?: string;
                  avatar?: string;
                };
                return {
                  id: user.id,
                  username: user.username,
                  discriminator: user.discriminator,
                  globalName: user.global_name || user.username,
                  avatar: user.avatar
                };
              }
            } catch (error) {
              logger.error(`Failed to fetch user ${userId}: ${error}`);
            }
            return null;
          });

          const additionalUsers = await Promise.all(userInfoPromises);
          additionalUsers.forEach(user => {
            if (user) {
              memberMap.set(user.id, user);
            }
          });

          const result = userIdArray.map(id => memberMap.get(id) || { id, username: `Unknown User (${id})` });
          return res.json(result);
        }
      } catch (error) {
        logger.error(`Error fetching guild members: ${error}`);
        // Fall through to individual user fetching
      }
    }

    // Fallback: fetch users individually
    const userInfoPromises = userIdArray.map(async (userId) => {
      try {
        const userResponse = await fetch(`https://discord.com/api/users/${userId}`, {
          headers: {
            'Authorization': `Bot ${botToken}`
          }
        });

        if (userResponse.ok) {
          const user = await userResponse.json() as {
            id: string;
            username: string;
            discriminator: string;
            global_name?: string;
            avatar?: string;
          };
          return {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            globalName: user.global_name || user.username,
            avatar: user.avatar
          };
        } else {
          return { id: userId, username: `Unknown User (${userId})` };
        }
      } catch (error) {
        logger.error(`Failed to fetch user ${userId}: ${error}`);
        return { id: userId, username: `Unknown User (${userId})` };
      }
    });

    const users = await Promise.all(userInfoPromises);
    res.json(users);
  } catch (error: any) {
    logger.error(`Error fetching users: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

export default router;

