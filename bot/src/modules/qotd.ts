import cron from 'node-cron';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { formatInTimeZone } from 'date-fns-tz';
import { getServerConfig } from '../services/configService';
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

      // For weekly, check if it's the right day (Monday = 1)
      if (config.schedules.qotd.frequency === 'weekly') {
        const currentDay = parseInt(formatInTimeZone(now, config.timezone, 'e'));
        if (currentDay !== 1) continue; // Only post on Mondays for weekly
      }

      // Get random QOTD
      const qotd = await getRandomQOTD(guildId);
      if (!qotd) continue;

      // Create QOTD embed
      const embed = new EmbedBuilder()
        .setTitle('💭 Question of the Day')
        .setDescription(qotd.question)
        .setColor(COLORS.info)
        .addFields({ name: 'Category', value: qotd.category, inline: true })
        .setFooter({ text: `Submitted by ${(await guild.members.fetch(qotd.createdById).catch(() => null))?.user.tag || 'Unknown'}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      // Increment usage
      await incrementQOTDUse(qotd._id.toString());
    } catch (error) {
      logger.error(`Error checking QOTD for guild ${guildId}: ${error}`);
    }
  }
}

