import express from 'express';
import { requireAdmin } from '../middleware/admin';
import { authenticateToken } from '../middleware/auth';
import { QOTD } from '../database/models/QOTD';
import { Prompt } from '../database/models/Prompt';
import { OC } from '../database/models/OC';
import { COTWHistory } from '../database/models/COTWHistory';
import { BirthdayLog } from '../database/models/BirthdayLog';
import { ServerConfig } from '../database/models/ServerConfig';
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
      title: '💭 Question of the Day',
      description: qotd.question,
      color: COLORS.info,
      fields: [
        { name: 'Category', value: qotd.category, inline: true }
      ],
      timestamp: new Date().toISOString()
    };

    if (qotd.fandom) {
      embed.fields.push({ name: 'Fandom', value: qotd.fandom, inline: true });
    }

    embed.fields.push({ name: 'Used', value: `${qotd.timesUsed} times`, inline: false });

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
      fields: [
        { name: 'Category', value: prompt.category, inline: true }
      ],
      timestamp: new Date().toISOString()
    };

    if (prompt.fandom) {
      embed.fields.push({ name: 'Fandom', value: prompt.fandom, inline: true });
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

    // Create embed (simplified OC card format)
    const embed = {
      title: `💫 Character of the Week: ${oc.name}`,
      description: `This week's featured OC! Share art, facts, or anything about ${oc.name}! ✨`,
      color: COLORS.primary,
      fields: [
        { name: 'Name', value: oc.name, inline: true },
        { name: 'Fandom', value: oc.fandom || 'Original', inline: true },
        { name: 'Owner', value: `<@${oc.ownerId}>`, inline: true }
      ],
      timestamp: new Date().toISOString()
    };

    if (oc.age) {
      embed.fields.push({ name: 'Age', value: oc.age.toString(), inline: true });
    }
    if (oc.gender) {
      embed.fields.push({ name: 'Gender', value: oc.gender, inline: true });
    }
    if (oc.species) {
      embed.fields.push({ name: 'Species', value: oc.species, inline: true });
    }

    if (oc.description) {
      const desc = oc.description.length > 1000 ? oc.description.substring(0, 1000) + '...' : oc.description;
      embed.fields.push({ name: 'Description', value: desc, inline: false });
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

    // Create embed
    const embed = {
      title: `🎉 Happy Birthday, ${oc.name}!`,
      description: `Today is ${oc.name}'s birthday! 🎂`,
      color: COLORS.success,
      fields: [
        { name: '👤 Owner', value: `<@${oc.ownerId}>`, inline: true },
        { name: '🎭 Fandom', value: oc.fandom, inline: true },
        { name: '🎂 Birthday', value: oc.birthday, inline: true }
      ],
      timestamp: new Date().toISOString()
    };

    if (oc.bioLink) {
      embed.fields.push({ name: '🔗 Bio', value: oc.bioLink, inline: false });
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

export default router;

