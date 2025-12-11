import cron from 'node-cron';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { formatInTimeZone } from 'date-fns-tz';
import { getServerConfig } from '../services/configService';
import { getAllOCs } from '../services/ocService';
import { BirthdayLog } from '../database/models/BirthdayLog';
import { COLORS } from '../utils/embeds';
import { logger } from '../utils/logger';

let birthdayCronJob: cron.ScheduledTask | null = null;

export function startBirthdayScheduler(client: Client) {
  // Run daily at 00:01 in each server's timezone
  // For simplicity, we'll check all servers every hour and filter by their timezone
  birthdayCronJob = cron.schedule('0 * * * *', async () => {
    await checkBirthdays(client);
  });

  logger.success('Birthday scheduler started');
}

export function stopBirthdayScheduler() {
  if (birthdayCronJob) {
    birthdayCronJob.stop();
    birthdayCronJob = null;
  }
}

async function checkBirthdays(client: Client) {
  const guilds = client.guilds.cache;
  
  for (const [guildId, guild] of guilds) {
    try {
      const config = await getServerConfig(guildId);
      if (!config || !config.features.birthdays || !config.schedules.birthdays.enabled) continue;
      if (!config.channels.birthdays) continue;

      const channel = await guild.channels.fetch(config.channels.birthdays) as TextChannel;
      if (!channel) continue;

      // Get current time in server's timezone
      const now = new Date();
      const serverTime = formatInTimeZone(now, config.timezone, 'HH:mm');
      const [scheduledHour, scheduledMinute] = config.schedules.birthdays.time.split(':');
      const currentHour = parseInt(serverTime.split(':')[0]);
      const currentMinute = parseInt(serverTime.split(':')[1]);

      // Only run at the scheduled time
      if (currentHour !== parseInt(scheduledHour) || currentMinute !== parseInt(scheduledMinute)) {
        continue;
      }

      const today = formatInTimeZone(now, config.timezone, 'MM-dd');
      const currentYear = parseInt(formatInTimeZone(now, config.timezone, 'yyyy'));

      const ocs = await getAllOCs(guildId);
      const birthdayOCs = ocs.filter(oc => oc.birthday === today);

      for (const oc of birthdayOCs) {
        // Check if we've already announced this birthday this year
        const existingLog = await BirthdayLog.findOne({
          guildId,
          ocId: oc._id,
          yearAnnounced: currentYear
        });

        if (existingLog) continue;

        // Create birthday announcement (simplified - only name, fandom, link, icon, yume)
        const embed = new EmbedBuilder()
          .setTitle(`🎉 Happy Birthday, ${oc.name}!`)
          .setDescription(`Today is ${oc.name}'s birthday! 🎂`)
          .setColor(COLORS.success)
          .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
          .addFields(
            { name: '🎭 Fandom' + (oc.fandoms && oc.fandoms.length > 1 ? 's' : ''), value: (oc.fandoms && oc.fandoms.length > 0) ? oc.fandoms.join(', ') : 'Original', inline: false }
          )
          .setTimestamp();

        // Add character icon (thumbnail) if available
        if (oc.imageUrl) {
          embed.setThumbnail(oc.imageUrl);
        }

        // Add bio link if available
        if (oc.bioLink) {
          embed.addFields({ name: '🔗 Bio Link', value: oc.bioLink, inline: false });
        }

        // Add yume info if available
        if (oc.yume) {
          let yumeText = '';
          if (oc.yume.foName) yumeText += `**F/O:** ${oc.yume.foName}\n`;
          if (oc.yume.foSource) yumeText += `**Source:** ${oc.yume.foSource}\n`;
          if (oc.yume.relationshipType) yumeText += `**Type:** ${oc.yume.relationshipType}\n`;
          if (oc.yume.foImageUrl) yumeText += `**F/O Image:** [View Image](${oc.yume.foImageUrl})\n`;
          
          if (yumeText) {
            embed.addFields({ name: '💕 Yume Info', value: yumeText, inline: false });
          }
        }

        await channel.send({ embeds: [embed] });

        // Log the announcement
        const log = new BirthdayLog({
          guildId,
          ocId: oc._id,
          channelId: channel.id,
          date: new Date(`${currentYear}-${oc.birthday}`),
          yearAnnounced: currentYear
        });
        await log.save();
      }
    } catch (error) {
      logger.error(`Error checking birthdays for guild ${guildId}: ${error}`);
    }
  }
}

