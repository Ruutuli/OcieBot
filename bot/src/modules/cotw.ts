import cron from 'node-cron';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { formatInTimeZone } from 'date-fns-tz';
import { getServerConfig } from '../services/configService';
import { getAllOCs, getOCById } from '../services/ocService';
import { COTWHistory } from '../database/models/COTWHistory';
import { COLORS } from '../utils/embeds';
import { logger } from '../utils/logger';

let cotwCronJob: cron.ScheduledTask | null = null;

export function startCOTWScheduler(client: Client) {
  // Check every hour for COTW scheduling
  cotwCronJob = cron.schedule('0 * * * *', async () => {
    await checkCOTW(client);
  });

  logger.success('COTW scheduler started');
}

export function stopCOTWScheduler() {
  if (cotwCronJob) {
    cotwCronJob.stop();
    cotwCronJob = null;
  }
}

async function checkCOTW(client: Client) {
  const guilds = client.guilds.cache;
  
  for (const [guildId, guild] of guilds) {
    try {
      const config = await getServerConfig(guildId);
      if (!config || !config.features.cotw || !config.schedules.cotw.enabled) continue;
      if (!config.channels.cotw) continue;

      const channel = await guild.channels.fetch(config.channels.cotw) as TextChannel;
      if (!channel) continue;

      // Get current time in server's timezone
      const now = new Date();
      const serverTime = formatInTimeZone(now, config.timezone, 'HH:mm');
      const [scheduledHour, scheduledMinute] = config.schedules.cotw.time.split(':');
      const currentHour = parseInt(serverTime.split(':')[0]);
      const currentMinute = parseInt(serverTime.split(':')[1]);
      const currentDay = parseInt(formatInTimeZone(now, config.timezone, 'e')); // 1-7 (Monday-Sunday)

      // Only run at the scheduled day and time
      if (currentDay !== config.schedules.cotw.dayOfWeek || 
          currentHour !== parseInt(scheduledHour) || 
          currentMinute !== parseInt(scheduledMinute)) {
        continue;
      }

      // Check if we've already posted COTW this week
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - currentDay + 1);
      weekStart.setHours(0, 0, 0, 0);

      const existingCOTW = await COTWHistory.findOne({
        guildId,
        date: { $gte: weekStart }
      });

      if (existingCOTW) continue;

      // Get all OCs
      const ocs = await getAllOCs(guildId);
      if (ocs.length === 0) continue;

      // Get recently spotlighted OCs (last 4 weeks)
      const fourWeeksAgo = new Date(now);
      fourWeeksAgo.setDate(now.getDate() - 28);
      const recentCOTWs = await COTWHistory.find({
        guildId,
        date: { $gte: fourWeeksAgo }
      }).sort({ date: -1 });

      const recentOCIds = recentCOTWs.map(cotw => cotw.ocId.toString());

      // Filter out recently spotlighted OCs
      const availableOCs = ocs.filter(oc => !recentOCIds.includes(oc._id.toString()));

      // If all OCs have been spotlighted recently, use all OCs
      const pool = availableOCs.length > 0 ? availableOCs : ocs;

      // Select random OC
      const randomOC = pool[Math.floor(Math.random() * pool.length)];

      // Create COTW embed (simplified - only name, fandom, link, icon, yume)
      const embed = new EmbedBuilder()
        .setTitle(`💫 Character of the Week: ${randomOC.name}`)
        .setDescription(`This week's featured OC! Share art, facts, or anything about ${randomOC.name}! ✨`)
        .setColor(COLORS.primary)
        .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
        .addFields(
          { name: '🎭 Fandom', value: randomOC.fandom || 'Original', inline: false }
        );

      // Add character icon (thumbnail) if available
      if (randomOC.imageUrl) {
        embed.setThumbnail(randomOC.imageUrl);
      }

      // Add bio link if available
      if (randomOC.bioLink) {
        embed.addFields({ name: '🔗 Bio Link', value: randomOC.bioLink, inline: false });
      }

      // Add yume info if available
      if (randomOC.yume) {
        let yumeText = '';
        if (randomOC.yume.foName) yumeText += `**F/O:** ${randomOC.yume.foName}\n`;
        if (randomOC.yume.foSource) yumeText += `**Source:** ${randomOC.yume.foSource}\n`;
        if (randomOC.yume.relationshipType) yumeText += `**Type:** ${randomOC.yume.relationshipType}\n`;
        if (randomOC.yume.foImageUrl) yumeText += `**F/O Image:** [View Image](${randomOC.yume.foImageUrl})\n`;
        
        if (yumeText) {
          embed.addFields({ name: '💕 Yume Info', value: yumeText, inline: false });
        }
      }

      await channel.send({ embeds: [embed] });

      // Log the COTW
      const cotwHistory = new COTWHistory({
        guildId,
        ocId: randomOC._id,
        channelId: channel.id,
        date: now
      });
      await cotwHistory.save();
    } catch (error) {
      logger.error(`Error checking COTW for guild ${guildId}: ${error}`);
    }
  }
}

export async function getCurrentCOTW(guildId: string) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const cotw = await COTWHistory.findOne({
    guildId,
    date: { $gte: weekStart }
  }).sort({ date: -1 }).populate('ocId');

  return cotw;
}

export async function getCOTWHistory(guildId: string, limit: number = 20) {
  return await COTWHistory.find({ guildId })
    .sort({ date: -1 })
    .limit(limit)
    .populate('ocId');
}

export async function createCOTW(guildId: string, ocId: string, channelId: string) {
  const cotw = new COTWHistory({
    guildId,
    ocId,
    channelId,
    date: new Date()
  });
  return await cotw.save();
}

