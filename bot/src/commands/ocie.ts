import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { hasManageServer } from '../utils/permissions';
import { createEmbed, createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { getOrCreateServerConfig, getServerConfig, updateServerConfig } from '../services/configService';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ocie')
    .setDescription('OcieBot main command')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Start the setup wizard for OcieBot')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('View and manage OcieBot settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set a specific configuration value')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('What to set')
            .setRequired(true)
            .addChoices(
              { name: 'Channel', value: 'channel' },
              { name: 'Timezone', value: 'timezone' },
              { name: 'COTW Schedule', value: 'cotw-schedule' },
              { name: 'QOTD Schedule', value: 'qotd-schedule' },
              { name: 'Birthday Time', value: 'birthday-time' }
            )
        )
            .addStringOption(option =>
              option
                .setName('value')
                .setDescription('What to set (e.g., "cotw" for Character of the Week, "birthdays" for birthday announcements, etc.)')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Select the Discord channel (required when setting a channel type)')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('feature')
        .setDescription('Toggle a feature on/off')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Feature name')
            .setRequired(true)
            .addChoices(
              { name: 'Character of the Week', value: 'cotw' },
              { name: 'Birthdays', value: 'birthdays' },
              { name: 'QOTD', value: 'qotd' },
              { name: 'Prompts', value: 'prompts' },
              { name: 'Trivia', value: 'trivia' },
              { name: 'Playlists', value: 'playlists' }
            )
        )
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable the feature')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('help')
        .setDescription('Show help information')
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'help') {
      await handleHelp(interaction);
      return;
    }

    // Other subcommands require Manage Server permission
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!hasManageServer(member)) {
      await interaction.reply({ embeds: [createErrorEmbed('You need Manage Server permission to configure OcieBot!')], ephemeral: true });
      return;
    }

    if (subcommand === 'setup') {
      await handleSetup(interaction);
    } else if (subcommand === 'settings') {
      await handleSettings(interaction);
    } else if (subcommand === 'set') {
      await handleSet(interaction);
    } else if (subcommand === 'feature') {
      await handleFeatureToggle(interaction);
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const subcommand = interaction.options.getSubcommand(false);
    
    if (subcommand !== 'set') {
      return;
    }

    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name !== 'value') {
      return;
    }

    const type = interaction.options.getString('type');
    const focusedValue = focusedOption.value.toLowerCase();

    // If type is not selected yet, return empty
    if (!type) {
      await interaction.respond([]);
      return;
    }

    try {
      let choices: { name: string; value: string }[] = [];

      if (type === 'channel') {
        // Channel types: cotw, birthdays, qotd, prompts, logs
        const channelTypes = [
          { name: 'COTW - Character of the Week channel', value: 'cotw' },
          { name: 'Birthdays - Birthday announcement channel', value: 'birthdays' },
          { name: 'QOTD - Question of the Day channel', value: 'qotd' },
          { name: 'Prompts - RP prompt channel', value: 'prompts' },
          { name: 'Logs - Bot log channel', value: 'logs' }
        ];
        choices = channelTypes.filter(choice => 
          choice.name.toLowerCase().includes(focusedValue) || 
          choice.value.toLowerCase().includes(focusedValue)
        );
      } else if (type === 'timezone') {
        // Common timezones
        const timezones = [
          { name: 'America/New_York (EST/EDT)', value: 'America/New_York' },
          { name: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
          { name: 'America/Denver (MST/MDT)', value: 'America/Denver' },
          { name: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
          { name: 'America/Phoenix (MST)', value: 'America/Phoenix' },
          { name: 'America/Anchorage (AKST/AKDT)', value: 'America/Anchorage' },
          { name: 'America/Honolulu (HST)', value: 'America/Honolulu' },
          { name: 'Europe/London (GMT/BST)', value: 'Europe/London' },
          { name: 'Europe/Paris (CET/CEST)', value: 'Europe/Paris' },
          { name: 'Europe/Berlin (CET/CEST)', value: 'Europe/Berlin' },
          { name: 'Europe/Moscow (MSK)', value: 'Europe/Moscow' },
          { name: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
          { name: 'Asia/Shanghai (CST)', value: 'Asia/Shanghai' },
          { name: 'Asia/Hong_Kong (HKT)', value: 'Asia/Hong_Kong' },
          { name: 'Australia/Sydney (AEDT/AEST)', value: 'Australia/Sydney' },
          { name: 'UTC', value: 'UTC' }
        ];
        choices = timezones.filter(choice => 
          choice.name.toLowerCase().includes(focusedValue) || 
          choice.value.toLowerCase().includes(focusedValue)
        ).slice(0, 25);
      } else if (type === 'cotw-schedule') {
        // Day of week suggestions (0 = Sunday, 1 = Monday, etc.)
        const days = [
          { name: 'Sunday (0)', value: '0' },
          { name: 'Monday (1)', value: '1' },
          { name: 'Tuesday (2)', value: '2' },
          { name: 'Wednesday (3)', value: '3' },
          { name: 'Thursday (4)', value: '4' },
          { name: 'Friday (5)', value: '5' },
          { name: 'Saturday (6)', value: '6' }
        ];
        choices = days.filter(choice => 
          choice.name.toLowerCase().includes(focusedValue) || 
          choice.value.includes(focusedValue)
        );
      } else if (type === 'qotd-schedule') {
        // Frequency options
        const frequencies = [
          { name: 'Daily', value: 'daily' },
          { name: 'Weekly', value: 'weekly' }
        ];
        choices = frequencies.filter(choice => 
          choice.name.toLowerCase().includes(focusedValue) || 
          choice.value.toLowerCase().includes(focusedValue)
        );
      } else if (type === 'birthday-time') {
        // Time format suggestions
        const times = [
          { name: '09:00', value: '09:00' },
          { name: '10:00', value: '10:00' },
          { name: '12:00', value: '12:00' },
          { name: '14:00', value: '14:00' },
          { name: '18:00', value: '18:00' },
          { name: '20:00', value: '20:00' }
        ];
        choices = times.filter(choice => 
          choice.value.includes(focusedValue)
        );
      }

      await interaction.respond(choices.slice(0, 25));
    } catch (error) {
      console.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  }
};

async function handleSetup(interaction: ChatInputCommandInteraction) {
  const embed = createEmbed(
    '👋 Welcome to OcieBot Setup!',
    'I\'m OcieBot — I help organize your OCs, yumeships, birthdays, prompts, and trivia.\n\n' +
    'Let\'s do a quick setup so I know which channels to use and which features you want to enable. 💖'
  );

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('Start Setup')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleSettings(interaction: ChatInputCommandInteraction) {
  const config = await getOrCreateServerConfig(interaction.guild!.id);
  
  const embed = createEmbed('⚙️ OcieBot Settings', undefined, COLORS.info);
  
  embed.addFields(
    { name: '📺 Channels', value: 
      `COTW: ${config.channels.cotw ? `<#${config.channels.cotw}>` : 'Not set'}\n` +
      `Birthdays: ${config.channels.birthdays ? `<#${config.channels.birthdays}>` : 'Not set'}\n` +
      `QOTD: ${config.channels.qotd ? `<#${config.channels.qotd}>` : 'Not set'}\n` +
      `Prompts: ${config.channels.prompts ? `<#${config.channels.prompts}>` : 'Not set'}\n` +
      `Logs: ${config.channels.logs ? `<#${config.channels.logs}>` : 'Not set'}`, inline: false },
    { name: '✨ Features', value:
      `COTW: ${config.features.cotw ? '✅' : '❌'}\n` +
      `Birthdays: ${config.features.birthdays ? '✅' : '❌'}\n` +
      `QOTD: ${config.features.qotd ? '✅' : '❌'}\n` +
      `Prompts: ${config.features.prompts ? '✅' : '❌'}\n` +
      `Trivia: ${config.features.trivia ? '✅' : '❌'}\n` +
      `Playlists: ${config.features.playlists ? '✅' : '❌'}`, inline: false },
    { name: '🕒 Schedules', value:
      `COTW: ${config.schedules.cotw.enabled ? `Day ${config.schedules.cotw.dayOfWeek}, ${config.schedules.cotw.time}` : 'Disabled'}\n` +
      `QOTD: ${config.schedules.qotd.enabled ? `${config.schedules.qotd.frequency} at ${config.schedules.qotd.time}` : 'Disabled'}\n` +
      `Birthdays: ${config.schedules.birthdays.enabled ? `Daily at ${config.schedules.birthdays.time}` : 'Disabled'}`, inline: false },
    { name: '🌍 Timezone', value: config.timezone, inline: true }
  );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSet(interaction: ChatInputCommandInteraction) {
  const type = interaction.options.getString('type', true);
  const value = interaction.options.getString('value', true);
  const channel = interaction.options.getChannel('channel');

  const config = await getOrCreateServerConfig(interaction.guild!.id);

  try {
    if (type === 'channel') {
      const feature = value.toLowerCase();
      const validChannelTypes = ['cotw', 'birthdays', 'qotd', 'prompts', 'logs'];
      
      if (!validChannelTypes.includes(feature)) {
        await interaction.reply({ 
          embeds: [createErrorEmbed(
            `❌ Invalid channel type!\n\n` +
            `**Valid options are:**\n` +
            `• \`cotw\` - Character of the Week channel\n` +
            `• \`birthdays\` - Birthday announcement channel\n` +
            `• \`qotd\` - Question of the Day channel\n` +
            `• \`prompts\` - RP prompt channel\n` +
            `• \`logs\` - Bot log channel\n\n` +
            `**How to use:**\n` +
            `1. Type one of the options above in the "value" field (or select from autocomplete)\n` +
            `2. Select a Discord channel in the "channel" field\n` +
            `3. Run the command!`
          )], 
          ephemeral: true 
        });
        return;
      }
      
      if (!channel) {
        await interaction.reply({ 
          embeds: [createErrorEmbed(
            `❌ Missing channel!\n\n` +
            `You selected the channel type "${feature}", but you need to also select a Discord channel.\n\n` +
            `**How to fix:**\n` +
            `1. In the "channel" field, click and select a text channel from your server\n` +
            `2. Make sure the bot can see and send messages in that channel\n` +
            `3. Run the command again!`
          )], 
          ephemeral: true 
        });
        return;
      }
      
      if (channel.type !== ChannelType.GuildText) {
        await interaction.reply({ 
          embeds: [createErrorEmbed(
            `❌ Invalid channel type!\n\n` +
            `The channel you selected (${channel}) is not a text channel.\n\n` +
            `**Please select a regular text channel** (not a voice channel, forum, or other type).\n\n` +
            `You can find text channels in your server's channel list - they look like #channel-name.`
          )], 
          ephemeral: true 
        });
        return;
      }
      
      config.channels[feature as keyof typeof config.channels] = channel.id;
      await config.save();
      
      const featureNames: Record<string, string> = {
        cotw: 'Character of the Week',
        birthdays: 'Birthdays',
        qotd: 'Question of the Day',
        prompts: 'Prompts',
        logs: 'Logs'
      };
      
      await interaction.reply({ 
        embeds: [createSuccessEmbed(
          `✅ Successfully set ${featureNames[feature] || feature} channel!\n\n` +
          `The ${featureNames[feature] || feature} channel is now set to ${channel}`
        )], 
        ephemeral: true 
      });
    } else if (type === 'timezone') {
      config.timezone = value;
      await config.save();
      await interaction.reply({ embeds: [createSuccessEmbed(`Set timezone to ${value}`)], ephemeral: true });
    } else if (type === 'cotw-schedule') {
      // Format: "day time" e.g., "1 12:00" (Monday at 12:00)
      const [day, time] = value.split(' ');
      config.schedules.cotw.enabled = true;
      config.schedules.cotw.dayOfWeek = parseInt(day);
      config.schedules.cotw.time = time;
      await config.save();
      await interaction.reply({ embeds: [createSuccessEmbed(`Set COTW schedule to day ${day} at ${time}`)], ephemeral: true });
    } else if (type === 'qotd-schedule') {
      // Format: "frequency time" e.g., "daily 19:00" or "weekly 19:00"
      const [frequency, time] = value.split(' ');
      config.schedules.qotd.enabled = true;
      config.schedules.qotd.frequency = frequency as 'daily' | 'weekly';
      config.schedules.qotd.time = time;
      await config.save();
      await interaction.reply({ embeds: [createSuccessEmbed(`Set QOTD schedule to ${frequency} at ${time}`)], ephemeral: true });
    } else if (type === 'birthday-time') {
      config.schedules.birthdays.time = value;
      await config.save();
      await interaction.reply({ embeds: [createSuccessEmbed(`Set birthday announcement time to ${value}`)], ephemeral: true });
    }
  } catch (error) {
    console.error('Error updating config:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to update configuration.')], ephemeral: true });
  }
}

async function handleFeatureToggle(interaction: ChatInputCommandInteraction) {
  const featureName = interaction.options.getString('name', true);
  const enabled = interaction.options.getBoolean('enabled', true);

  const config = await getOrCreateServerConfig(interaction.guild!.id);
  config.features[featureName as keyof typeof config.features] = enabled;
  await config.save();

  await interaction.reply({
    embeds: [createSuccessEmbed(`${featureName} is now ${enabled ? 'enabled' : 'disabled'}`)],
    ephemeral: true
  });
}

async function handleHelp(interaction: ChatInputCommandInteraction) {
  const embed = createEmbed(
    '✨ OcieBot Help',
    'OcieBot helps you manage your OCs, birthdays, prompts, trivia, and more!'
  );
  
  embed.addFields(
    { name: '⚙️ Setup', value: '`/ocie setup` - Start the setup wizard\n`/ocie settings` - View current settings', inline: false },
    { name: '✨ OC Management', value: '`/oc add` - Add a new OC\n`/oc edit` - Edit an OC\n`/oc delete` - Delete an OC\n`/oc view` - View an OC card\n`/oc list` - List OCs\n`/oc random` - Get a random OC', inline: false },
    { name: '🎂 Birthdays', value: '`/birthday set` - Set OC birthday\n`/birthday list` - List all birthdays\n`/birthday month` - Birthdays this month\n`/birthday today` - Birthdays today', inline: false },
    { name: '💫 Character of the Week', value: '`/cotw current` - View current COTW\n`/cotw history` - View COTW history\n`/cotw reroll` - Reroll COTW (admin)', inline: false },
    { name: '💭 QOTD', value: '`/qotd add` - Add a QOTD\n`/qotd ask` - Ask a random QOTD\n`/qotd list` - List all QOTDs', inline: false },
    { name: '🎭 Prompts', value: '`/prompt add` - Add a prompt\n`/prompt random` - Get random prompt\n`/prompt use` - Post a prompt', inline: false },
    { name: '🧠 Trivia', value: '`/trivia add` - Add trivia question\n`/trivia start` - Start trivia game\n`/trivia answer` - Answer trivia', inline: false },
    { name: '📚 Fandoms', value: '`/fandom directory` - List all fandoms\n`/fandom info` - Get fandom info', inline: false },
    { name: '📊 Stats', value: '`/stats` - View server statistics', inline: false }
  );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export default command;

