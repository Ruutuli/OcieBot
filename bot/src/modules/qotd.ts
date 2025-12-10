import cron from 'node-cron';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { formatInTimeZone } from 'date-fns-tz';
import { differenceInDays } from 'date-fns';
import { getServerConfig, updateServerConfig } from '../services/configService';
import { getRandomQOTD, incrementQOTDUse } from '../services/qotdService';
import { COLORS } from '../utils/embeds';
import { logger } from '../utils/logger';

let qotdCronJob: cron.ScheduledTask | null = null;

export function startQOTDScheduler(client: Client) {
  // Check every hour for QOTD scheduling
  qotdCronJob = cron.schedule('0 * * * *', async () => {
    await checkQOTD(client);
  });

  logger.success('QOTD scheduler started');
}

export function stopQOTDScheduler() {
  if (qotdCronJob) {
    qotdCronJob.stop();
    qotdCronJob = null;
  }
}

async function checkQOTD(client: Client) {
  const guilds = client.guilds.cache;
  
  for (const [guildId, guild] of guilds) {
    try {
      const config = await getServerConfig(guildId);
      if (!config || !config.features.qotd || !config.schedules.qotd.enabled) continue;
      if (!config.channels.qotd) continue;

      const channel = await guild.channels.fetch(config.channels.qotd) as TextChannel;
      if (!channel) continue;

      // Get current time in server's timezone
      const now = new Date();
      const serverTime = formatInTimeZone(now, config.timezone, 'HH:mm');
      const [scheduledHour, scheduledMinute] = config.schedules.qotd.time.split(':');
      const currentHour = parseInt(serverTime.split(':')[0]);
      const currentMinute = parseInt(serverTime.split(':')[1]);

      // Check if it's time to post
      if (currentHour !== parseInt(scheduledHour) || currentMinute !== parseInt(scheduledMinute)) {
        continue;
      }

      // Check frequency-based posting rules
      const frequency = config.schedules.qotd.frequency;
      const lastPosted = config.schedules.qotd.lastPosted;
      
      if (frequency === 'weekly') {
        // For weekly, check if it's the right day (Monday = 1)
        const currentDay = parseInt(formatInTimeZone(now, config.timezone, 'e'));
        if (currentDay !== 1) continue; // Only post on Mondays for weekly
      } else if (frequency === 'every2days') {
        // Check if at least 2 days have passed since last post
        if (lastPosted) {
          const daysSinceLastPost = differenceInDays(now, lastPosted);
          if (daysSinceLastPost < 2) continue;
        }
        // If no lastPosted, allow posting (first time)
      } else if (frequency === 'every3days') {
        // Check if at least 3 days have passed since last post
        if (lastPosted) {
          const daysSinceLastPost = differenceInDays(now, lastPosted);
          if (daysSinceLastPost < 3) continue;
        }
        // If no lastPosted, allow posting (first time)
      }
      // For 'daily', no additional checks needed

      // Get random QOTD
      const qotd = await getRandomQOTD(guildId);
      if (!qotd) continue;

      // Create QOTD embed
      const embed = new EmbedBuilder()
        .setTitle(`💭 QOTD | ${qotd.category}`)
        .setDescription(qotd.question.length > 4096 ? qotd.question.substring(0, 4093) + '...' : qotd.question)
        .setColor(COLORS.info)
        .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
        .addFields({ name: 'QOTD ID', value: qotd._id.toString(), inline: false })
        .setFooter({ text: `Submitted by ${(await guild.members.fetch(qotd.createdById).catch(() => null))?.user.tag || 'Unknown'}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      // Increment usage
      await incrementQOTDUse(qotd._id.toString());

      // Update lastPosted date
      await updateServerConfig(guildId, {
        schedules: {
          ...config.schedules,
          qotd: {
            ...config.schedules.qotd,
            lastPosted: now
          }
        }
      });
    } catch (error) {
      logger.error(`Error checking QOTD for guild ${guildId}: ${error}`);
    }
  }
}

