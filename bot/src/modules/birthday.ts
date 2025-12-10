import cron from 'node-cron';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { formatInTimeZone } from 'date-fns-tz';
import { getServerConfig } from '../services/configService';
import { getAllOCs } from '../services/ocService';
import { BirthdayLog } from '../database/models/BirthdayLog';
import { formatOCCard } from '../utils/ocFormatter';
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

        // Create birthday announcement
        const embed = new EmbedBuilder()
          .setTitle(`🎉 Happy Birthday, ${oc.name}!`)
          .setDescription(`Today is ${oc.name}'s birthday! 🎂`)
          .setColor(COLORS.success)
          .addFields(
            { name: '👤 Owner', value: `<@${oc.ownerId}>`, inline: false },
            { name: '🎭 Fandom', value: oc.fandom, inline: false },
            { name: '🎂 Birthday', value: oc.birthday!, inline: false }
          )
          .setTimestamp();

        // Add character icon (thumbnail) if available
        if (oc.imageUrl) {
          embed.setThumbnail(oc.imageUrl);
        }

        if (oc.bioLink) {
          embed.addFields({ name: '🔗 Bio', value: oc.bioLink, inline: false });
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

