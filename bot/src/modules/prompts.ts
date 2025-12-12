import cron from 'node-cron';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { formatInTimeZone } from 'date-fns-tz';
import { differenceInDays } from 'date-fns';
import { getServerConfig, updateServerConfig } from '../services/configService';
import { getRandomPrompt } from '../services/promptService';
import { COLORS } from '../utils/embeds';
import { logger } from '../utils/logger';

let promptsCronJob: cron.ScheduledTask | null = null;

export function startPromptsScheduler(client: Client) {
  // Check every hour for prompts scheduling
  promptsCronJob = cron.schedule('0 * * * *', async () => {
    await checkPrompts(client);
  });

  logger.success('Prompts scheduler started');
}

export function stopPromptsScheduler() {
  if (promptsCronJob) {
    promptsCronJob.stop();
    promptsCronJob = null;
  }
}

async function checkPrompts(client: Client) {
  const guilds = client.guilds.cache;
  
  for (const [guildId, guild] of guilds) {
    try {
      const config = await getServerConfig(guildId);
      if (!config || !config.features.prompts || !config.schedules.prompts.enabled) continue;
      if (!config.channels.prompts) continue;

      const channel = await guild.channels.fetch(config.channels.prompts) as TextChannel;
      if (!channel) continue;

      // Get current time in server's timezone
      const now = new Date();
      const serverTime = formatInTimeZone(now, config.timezone, 'HH:mm');
      const [scheduledHour, scheduledMinute] = config.schedules.prompts.time.split(':');
      const currentHour = parseInt(serverTime.split(':')[0]);
      const currentMinute = parseInt(serverTime.split(':')[1]);

      // Check if it's time to post
      if (currentHour !== parseInt(scheduledHour) || currentMinute !== parseInt(scheduledMinute)) {
        continue;
      }

      // Check frequency-based posting rules
      const frequency = config.schedules.prompts.frequency;
      const lastPosted = config.schedules.prompts.lastPosted;
      
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

      // Get random prompt
      const prompt = await getRandomPrompt(guildId);
      if (!prompt) continue;

      // Get fandom color if available
      const { Fandom } = await import('../database/models/Fandom');
      let fandomColor: string | undefined;
      if (prompt.fandom) {
        const storedFandom = await Fandom.findOne({ name: prompt.fandom, guildId });
        fandomColor = storedFandom?.color;
      }

      // Create prompt embed
      const embedColor = fandomColor && /^#[0-9A-F]{6}$/i.test(fandomColor)
        ? parseInt(fandomColor.substring(1), 16)
        : COLORS.secondary;

      const embed = new EmbedBuilder()
        .setTitle('🎭 RP Prompt')
        .setDescription(prompt.text)
        .setColor(embedColor)
        .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
        .addFields({ name: 'Category', value: prompt.category, inline: false });
      
      if (prompt.fandom) {
        embed.addFields({ name: 'Fandom', value: prompt.fandom, inline: false });
      }
      
      // Add creator info
      const creator = await guild.members.fetch(prompt.createdById).catch(() => null);
      embed.setFooter({ text: `Submitted by ${creator?.user.tag || 'Unknown'}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      // Update lastPosted date
      await updateServerConfig(guildId, {
        schedules: {
          ...config.schedules,
          prompts: {
            ...config.schedules.prompts,
            lastPosted: now
          }
        }
      });
    } catch (error) {
      logger.error(`Error checking prompts for guild ${guildId}: ${error}`);
    }
  }
}


