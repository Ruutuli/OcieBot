import express from 'express';
import { requireAdmin, isAdmin } from '../middleware/admin';
import { authenticateToken } from '../middleware/auth';
import { QOTD } from '../database/models/QOTD';
import { Prompt } from '../database/models/Prompt';
import { OC } from '../database/models/OC';
import { COTWHistory } from '../database/models/COTWHistory';
import { BirthdayLog } from '../database/models/BirthdayLog';
import { ServerConfig } from '../database/models/ServerConfig';
import { Admin } from '../database/models/Admin';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

const COLORS = {
  primary: 0xFFB6C1,
  secondary: 0xB0E0E6,
  success: 0x98D8C8,
  warning: 0xFFD4A3,
  error: 0xFFA8A8,
  info: 0xD4A5FF
};

// Test posting QOTD
router.post('/test/qotd', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { guildId, category, channelId, qotdId } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get config to find QOTD channel if not provided
    const config = await ServerConfig.findOne({ guildId });
    const targetChannelId = channelId || config?.channels?.qotd;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'QOTD channel not configured. Provide channelId or configure in settings.' });
    }

    // Get QOTD
    let qotd;
    if (qotdId) {
      qotd = await QOTD.findById(qotdId);
      if (!qotd || qotd.guildId !== guildId) {
        return res.status(404).json({ error: 'QOTD not found' });
      }
    } else {
      // Get random QOTD
      const query: any = { guildId };
      if (category) query.category = category;
      const count = await QOTD.countDocuments(query);
      if (count === 0) {
        return res.status(404).json({ error: 'No QOTDs found' });
      }
      const random = Math.floor(Math.random() * count);
      const qotds = await QOTD.find(query).skip(random).limit(1);
      qotd = qotds[0];
    }

    // Create embed
    const embed = {
      title: `💭 QOTD | ${qotd.category}`,
      description: qotd.question.length > 4096 ? qotd.question.substring(0, 4093) + '...' : qotd.question,
      color: COLORS.info,
      image: { url: 'https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif' },
      fields: [],
      timestamp: new Date().toISOString()
    };

    // Add QOTD ID field
    embed.fields.push({ name: 'QOTD ID', value: qotd._id.toString(), inline: false });

    if (qotd.fandom) {
      embed.fields.push({ name: 'Fandom', value: qotd.fandom, inline: false });
    }

    // Post to Discord
    const discordResponse = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to post to Discord');
    }

    // Increment usage
    await QOTD.findByIdAndUpdate(qotd._id, { $inc: { timesUsed: 1 } });

    const message = await discordResponse.json();

    res.json({ success: true, message: 'QOTD posted successfully', qotd, messageId: message.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post QOTD' });
  }
});

// Test posting Prompt
router.post('/test/prompt', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { guildId, category, channelId, promptId } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get config to find prompt channel if not provided
    const config = await ServerConfig.findOne({ guildId });
    const targetChannelId = channelId || config?.channels?.prompts;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'Prompt channel not configured. Provide channelId or configure in settings.' });
    }

    // Get Prompt
    let prompt;
    if (promptId) {
      prompt = await Prompt.findById(promptId);
      if (!prompt || prompt.guildId !== guildId) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
    } else {
      // Get random prompt
      const query: any = { guildId };
      if (category) query.category = category;
      const count = await Prompt.countDocuments(query);
      if (count === 0) {
        return res.status(404).json({ error: 'No prompts found' });
      }
      const random = Math.floor(Math.random() * count);
      const prompts = await Prompt.find(query).skip(random).limit(1);
      prompt = prompts[0];
    }

    // Create embed
    const embed = {
      title: '🎭 RP Prompt',
      description: prompt.text,
      color: COLORS.secondary,
      image: { url: 'https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif' },
      fields: [
        { name: 'Category', value: prompt.category, inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    if (prompt.fandom) {
      embed.fields.push({ name: 'Fandom', value: prompt.fandom, inline: false });
    }

    // Post to Discord
    const discordResponse = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to post to Discord');
    }

    const message = await discordResponse.json();

    res.json({ success: true, message: 'Prompt posted successfully', prompt, messageId: message.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post prompt' });
  }
});

// Test posting COTW
router.post('/test/cotw', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { guildId, ocId, channelId } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get config to find COTW channel if not provided
    const config = await ServerConfig.findOne({ guildId });
    const targetChannelId = channelId || config?.channels?.cotw;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'COTW channel not configured. Provide channelId or configure in settings.' });
    }

    // Get OC
    let oc;
    if (ocId) {
      oc = await OC.findById(ocId);
      if (!oc || oc.guildId !== guildId) {
        return res.status(404).json({ error: 'OC not found' });
      }
    } else {
      // Get all OCs and select random
      const ocs = await OC.find({ guildId });
      if (ocs.length === 0) {
        return res.status(404).json({ error: 'No OCs found' });
      }

      // Get recently spotlighted (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const recentCOTWs = await COTWHistory.find({
        guildId,
        date: { $gte: fourWeeksAgo }
      }).sort({ date: -1 });

      const recentOCIds = recentCOTWs.map(cotw => cotw.ocId.toString());
      const availableOCs = ocs.filter(o => !recentOCIds.includes(o._id.toString()));
      const pool = availableOCs.length > 0 ? availableOCs : ocs;

      oc = pool[Math.floor(Math.random() * pool.length)];
    }

    // Create embed (simplified - only name, fandom, link, icon, yume)
    const embed: any = {
      title: `💫 Character of the Week: ${oc.name}`,
      description: `This week's featured OC! Share art, facts, or anything about ${oc.name}! ✨`,
      color: COLORS.primary,
      image: { url: 'https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif' },
      fields: [
        { name: '🎭 Fandom', value: oc.fandom || 'Original', inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    // Add character icon (thumbnail) if available
    if (oc.imageUrl) {
      embed.thumbnail = { url: oc.imageUrl };
    }

    // Add bio link if available
    if (oc.bioLink) {
      embed.fields.push({ name: '🔗 Bio Link', value: oc.bioLink, inline: false });
    }

    // Add yume info if available
    if (oc.yume) {
      let yumeText = '';
      if (oc.yume.foName) yumeText += `**F/O:** ${oc.yume.foName}\n`;
      if (oc.yume.foSource) yumeText += `**Source:** ${oc.yume.foSource}\n`;
      if (oc.yume.relationshipType) yumeText += `**Type:** ${oc.yume.relationshipType}\n`;
      
      if (yumeText) {
        embed.fields.push({ name: '💕 Yume Info', value: yumeText, inline: false });
      }
    }

    // Post to Discord
    const discordResponse = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to post to Discord');
    }

    // Create COTW history entry
    const cotw = new COTWHistory({
      guildId,
      ocId: oc._id,
      channelId: targetChannelId,
      date: new Date()
    });
    await cotw.save();

    const message = await discordResponse.json();

    res.json({ success: true, message: 'COTW posted successfully', oc, messageId: message.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post COTW' });
  }
});

// Test posting Birthday
router.post('/test/birthday', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { guildId, ocId, channelId } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    if (!ocId) {
      return res.status(400).json({ error: 'ocId is required for birthday posting' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get config to find birthday channel if not provided
    const config = await ServerConfig.findOne({ guildId });
    const targetChannelId = channelId || config?.channels?.birthdays;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'Birthday channel not configured. Provide channelId or configure in settings.' });
    }

    // Get OC
    const oc = await OC.findById(ocId);
    if (!oc || oc.guildId !== guildId) {
      return res.status(404).json({ error: 'OC not found' });
    }

    if (!oc.birthday) {
      return res.status(400).json({ error: 'OC does not have a birthday set' });
    }

    const currentYear = new Date().getFullYear();

    // Create embed (simplified - only name, fandom, link, icon, yume)
    const embed: any = {
      title: `🎉 Happy Birthday, ${oc.name}!`,
      description: `Today is ${oc.name}'s birthday! 🎂`,
      color: COLORS.success,
      image: { url: 'https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif' },
      fields: [
        { name: '🎭 Fandom', value: oc.fandom || 'Original', inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    // Add character icon (thumbnail) if available
    if (oc.imageUrl) {
      embed.thumbnail = { url: oc.imageUrl };
    }

    // Add bio link if available
    if (oc.bioLink) {
      embed.fields.push({ name: '🔗 Bio Link', value: oc.bioLink, inline: false });
    }

    // Add yume info if available
    if (oc.yume) {
      let yumeText = '';
      if (oc.yume.foName) yumeText += `**F/O:** ${oc.yume.foName}\n`;
      if (oc.yume.foSource) yumeText += `**Source:** ${oc.yume.foSource}\n`;
      if (oc.yume.relationshipType) yumeText += `**Type:** ${oc.yume.relationshipType}\n`;
      
      if (yumeText) {
        embed.fields.push({ name: '💕 Yume Info', value: yumeText, inline: false });
      }
    }

    // Post to Discord
    const discordResponse = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to post to Discord');
    }

    // Create birthday log entry
    const log = new BirthdayLog({
      guildId,
      ocId: oc._id,
      channelId: targetChannelId,
      date: new Date(`${currentYear}-${oc.birthday}`),
      yearAnnounced: currentYear
    });
    await log.save();

    const message = await discordResponse.json();

    res.json({ success: true, message: 'Birthday posted successfully', oc, messageId: message.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post birthday' });
  }
});

// Check if current user is admin
router.get('/check', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const adminStatus = await isAdmin(userId);
    res.json({ isAdmin: adminStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check admin status' });
  }
});

// Admin Management Routes
// Get all admins
router.get('/admins', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const admins = await Admin.find({}).sort({ createdAt: -1 });
    
    // Fetch user info from Discord for each admin
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const adminList = await Promise.all(
      admins.map(async (admin) => {
        try {
          if (botToken) {
            const userResponse = await fetch(`https://discord.com/api/users/${admin.userId}`, {
              headers: { 'Authorization': `Bot ${botToken}` }
            });
            if (userResponse.ok) {
              const userData = await userResponse.json();
              return {
                _id: admin._id,
                userId: admin.userId,
                username: userData.username,
                globalName: userData.global_name,
                avatar: userData.avatar,
                addedBy: admin.addedBy,
                createdAt: admin.createdAt
              };
            }
          }
        } catch (err) {
          // If Discord API fails, just return basic info
        }
        return {
          _id: admin._id,
          userId: admin.userId,
          username: null,
          globalName: null,
          avatar: null,
          addedBy: admin.addedBy,
          createdAt: admin.createdAt
        };
      })
    );
    
    res.json(adminList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch admins' });
  }
});

// Add admin
router.post('/admins', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check if already an admin
    const existingAdmin = await Admin.findOne({ userId });
    if (existingAdmin) {
      return res.status(400).json({ error: 'User is already an admin' });
    }

    const newAdmin = new Admin({
      userId,
      addedBy: req.user!.id
    });
    await newAdmin.save();

    res.json({ success: true, admin: newAdmin });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User is already an admin' });
    }
    res.status(500).json({ error: error.message || 'Failed to add admin' });
  }
});

// Remove admin
router.delete('/admins/:userId', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    // Prevent removing yourself
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'You cannot remove yourself as an admin' });
    }

    const admin = await Admin.findOneAndDelete({ userId });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ success: true, message: 'Admin removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to remove admin' });
  }
});

// Reroll QOTD (admin only)
router.post('/reroll/qotd', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { guildId, category } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get config to find QOTD channel
    const config = await ServerConfig.findOne({ guildId });
    const targetChannelId = config?.channels?.qotd;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'QOTD channel not configured' });
    }

    // Get random QOTD
    const query: any = { guildId };
    if (category) query.category = category;
    const count = await QOTD.countDocuments(query);
    if (count === 0) {
      return res.status(404).json({ error: 'No QOTDs found' });
    }
    const random = Math.floor(Math.random() * count);
    const qotds = await QOTD.find(query).skip(random).limit(1);
    const qotd = qotds[0];

    // Create embed
    const embed = {
      title: `💭 QOTD | ${qotd.category}`,
      description: qotd.question.length > 4096 ? qotd.question.substring(0, 4093) + '...' : qotd.question,
      color: COLORS.info,
      image: { url: 'https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif' },
      fields: [],
      timestamp: new Date().toISOString()
    };

    // Add QOTD ID field
    embed.fields.push({ name: 'QOTD ID', value: qotd._id.toString(), inline: false });

    if (qotd.fandom) {
      embed.fields.push({ name: 'Fandom', value: qotd.fandom, inline: false });
    }

    // Post to Discord
    const discordResponse = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to post to Discord');
    }

    // Increment usage
    await QOTD.findByIdAndUpdate(qotd._id, { $inc: { timesUsed: 1 } });

    const message = await discordResponse.json();

    res.json({ success: true, message: 'QOTD rerolled successfully', qotd, messageId: message.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reroll QOTD' });
  }
});

// Reroll Prompt (admin only)
router.post('/reroll/prompt', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { guildId, category } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get config to find prompt channel
    const config = await ServerConfig.findOne({ guildId });
    const targetChannelId = config?.channels?.prompts;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'Prompt channel not configured' });
    }

    // Get random prompt
    const query: any = { guildId };
    if (category) query.category = category;
    const count = await Prompt.countDocuments(query);
    if (count === 0) {
      return res.status(404).json({ error: 'No prompts found' });
    }
    const random = Math.floor(Math.random() * count);
    const prompts = await Prompt.find(query).skip(random).limit(1);
    const prompt = prompts[0];

    // Create embed
    const embed = {
      title: '🎭 RP Prompt',
      description: prompt.text,
      color: COLORS.secondary,
      image: { url: 'https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif' },
      fields: [
        { name: 'Category', value: prompt.category, inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    if (prompt.fandom) {
      embed.fields.push({ name: 'Fandom', value: prompt.fandom, inline: false });
    }

    // Post to Discord
    const discordResponse = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to post to Discord');
    }

    const message = await discordResponse.json();

    res.json({ success: true, message: 'Prompt rerolled successfully', prompt, messageId: message.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reroll prompt' });
  }
});

// Reroll COTW (admin only - posts to Discord)
router.post('/reroll/cotw', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { guildId } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get config to find COTW channel
    const config = await ServerConfig.findOne({ guildId });
    const targetChannelId = config?.channels?.cotw;

    if (!targetChannelId) {
      return res.status(400).json({ error: 'COTW channel not configured' });
    }

    // Get all OCs and select random
    const ocs = await OC.find({ guildId });
    if (ocs.length === 0) {
      return res.status(404).json({ error: 'No OCs found' });
    }

    // Get recently spotlighted (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentCOTWs = await COTWHistory.find({
      guildId,
      date: { $gte: fourWeeksAgo }
    }).sort({ date: -1 });

    const recentOCIds = recentCOTWs.map(cotw => cotw.ocId.toString());
    const availableOCs = ocs.filter(o => !recentOCIds.includes(o._id.toString()));
    const pool = availableOCs.length > 0 ? availableOCs : ocs;

    const oc = pool[Math.floor(Math.random() * pool.length)];

    // Create embed
    const embed: any = {
      title: `💫 Character of the Week: ${oc.name}`,
      description: `This week's featured OC! Share art, facts, or anything about ${oc.name}! ✨`,
      color: COLORS.primary,
      image: { url: 'https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif' },
      fields: [
        { name: '🎭 Fandom', value: oc.fandom || 'Original', inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    // Add character icon (thumbnail) if available
    if (oc.imageUrl) {
      embed.thumbnail = { url: oc.imageUrl };
    }

    // Add bio link if available
    if (oc.bioLink) {
      embed.fields.push({ name: '🔗 Bio Link', value: oc.bioLink, inline: false });
    }

    // Add yume info if available
    if (oc.yume) {
      let yumeText = '';
      if (oc.yume.foName) yumeText += `**F/O:** ${oc.yume.foName}\n`;
      if (oc.yume.foSource) yumeText += `**Source:** ${oc.yume.foSource}\n`;
      if (oc.yume.relationshipType) yumeText += `**Type:** ${oc.yume.relationshipType}\n`;
      
      if (yumeText) {
        embed.fields.push({ name: '💕 Yume Info', value: yumeText, inline: false });
      }
    }

    // Post to Discord
    const discordResponse = await fetch(`https://discord.com/api/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to post to Discord');
    }

    // Create COTW history entry
    const cotw = new COTWHistory({
      guildId,
      ocId: oc._id,
      channelId: targetChannelId,
      date: new Date()
    });
    await cotw.save();

    const message = await discordResponse.json();

    res.json({ success: true, message: 'COTW rerolled successfully', oc, messageId: message.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reroll COTW' });
  }
});

export default router;

