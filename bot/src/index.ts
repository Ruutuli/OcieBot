import { Client, GatewayIntentBits, Events, Interaction, Guild, TextChannel, AuditLogEvent, ChannelType, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from './database/connection';
import { loadCommands, registerCommands, registerCommandsForGuild, clearGlobalCommands, Command } from './utils/commandHandler';
import { Collection } from 'discord.js';
import { startBirthdayScheduler } from './modules/birthday';
import { startCOTWScheduler } from './modules/cotw';
import { startQOTDScheduler } from './modules/qotd';
import { logger } from './utils/logger';
import { getOrCreateServerConfig } from './services/configService';
import { createEmbed, createErrorEmbed, createSuccessEmbed, COLORS } from './utils/embeds';
import { hasManageServer } from './utils/permissions';

// Load .env from project root (parent directory)
// In Railway, environment variables are provided directly, but we still try to load .env for local dev
const envPath = path.resolve(__dirname, '../../.env');
try {
  dotenv.config({ path: envPath });
} catch (error) {
  // In Railway, env vars are provided directly, so this is fine
  // dotenv.config() will use process.env if file doesn't exist
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

let commands: Collection<string, Command> = new Collection();

client.once(Events.ClientReady, async (readyClient) => {
  logger.success(`${readyClient.user.tag} is ready!`);
  
  // Load and register commands
  logger.info('Loading commands...');
  commands = await loadCommands(client);
  await registerCommands(client, commands);
  logger.success(`Loaded ${commands.size} command(s)`);
  
  // Initialize ServerConfig for all existing guilds
  logger.info('Initializing server configurations...');
  const guilds = readyClient.guilds.cache;
  let initializedCount = 0;
  for (const guild of guilds.values()) {
    try {
      await getOrCreateServerConfig(guild.id);
      initializedCount++;
    } catch (error) {
      logger.error(`Failed to initialize config for guild ${guild.id}: ${error}`);
    }
  }
  logger.success(`Initialized ${initializedCount} server configuration(s)`);
  
  // Start scheduled tasks
  logger.info('Starting scheduled tasks...');
  startBirthdayScheduler(client);
  startCOTWScheduler(client);
  startQOTDScheduler(client);
  
  logger.success('Bot is fully initialized!');
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);

    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing ${interaction.commandName}: ${error}`);
      
      const errorMessage = { content: '❌ There was an error while executing this command!', ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  } else if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);

    if (!command || !command.autocomplete) {
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      logger.error(`Error handling autocomplete for ${interaction.commandName}: ${error}`);
    }
  } else if (interaction.isButton()) {
    try {
      await handleButtonInteraction(interaction);
    } catch (error) {
      logger.error(`Error handling button interaction: ${error}`);
      
      const errorMessage = { content: '❌ There was an error while processing this interaction!', ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
});

// Create ServerConfig when bot joins a new guild
client.on(Events.GuildCreate, async (guild: Guild) => {
  try {
    await getOrCreateServerConfig(guild.id);
    logger.success(`Initialized server configuration for guild: ${guild.name} (${guild.id})`);
    
    // Register commands for the new guild (guild-specific deployment for immediate updates)
    if (commands.size > 0) {
      logger.info(`Registering commands for new guild: ${guild.name} (${guild.id})`);
      try {
        await registerCommandsForGuild(guild.id, commands);
      } catch (error) {
        logger.error(`Failed to register commands for new guild ${guild.name}: ${error}`);
      }
    }
    
    // Find who invited the bot via audit logs
    let inviterId: string | null = null;
    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.BotAdd,
        limit: 1
      });
      
      const entry = auditLogs.entries.first();
      if (entry && entry.executor) {
        inviterId = entry.executor.id;
        logger.info(`Found inviter for ${guild.name}: ${entry.executor.tag}`);
      }
    } catch (error) {
      logger.warn(`Could not fetch audit logs for ${guild.name}: ${error}`);
    }
    
    // Fallback to guild owner if we can't find the inviter
    if (!inviterId) {
      inviterId = guild.ownerId;
      logger.info(`Using guild owner as fallback for ${guild.name}`);
    }
    
    // Send DM to the person who added the bot
    try {
      if (inviterId) {
        const inviter = await guild.members.fetch(inviterId);
        const dmChannel = await inviter.createDM();
        
        const dashboardUrl = process.env.DASHBOARD_URL_PROD || process.env.DASHBOARD_URL || 'http://localhost:3000';
        
        const dmEmbed = createEmbed(
          '👋 Hi! Thanks for adding OcieBot!',
          `I'm OcieBot — I help organize your OCs, yumeships, birthdays, prompts, and trivia!\n\n` +
          `**To get started:**\n` +
          `• Use \`/ocie setup\` in your server to configure me\n` +
          `• Use \`/ocie help\` to see all available commands\n\n` +
          `**You can also manage everything via the dashboard:**\n` +
          `${dashboardUrl}\n\n` +
          `Thanks for inviting me! 💖`,
          COLORS.primary
        );
        
        await dmChannel.send({ embeds: [dmEmbed] });
        logger.success(`Sent welcome DM to ${inviter.user.tag}`);
      }
    } catch (error) {
      logger.warn(`Could not send DM to inviter: ${error}`);
    }
    
    // Send welcome message in a channel
    try {
      let welcomeChannel: TextChannel | null = null;
      
      // Try to use system channel first
      if (guild.systemChannel && guild.systemChannel.isTextBased()) {
        welcomeChannel = guild.systemChannel as TextChannel;
      } else {
        // Find first text channel the bot can send messages to
        const channels = guild.channels.cache
          .filter(channel => 
            channel.isTextBased() && 
            channel.type === ChannelType.GuildText &&
            channel.permissionsFor(guild.members.me!)?.has(['ViewChannel', 'SendMessages'])
          )
          .map(channel => channel as TextChannel)
          .sort((a, b) => a.position - b.position);
        
        if (channels.length > 0) {
          welcomeChannel = channels[0];
        }
      }
      
      if (welcomeChannel) {
        const dashboardUrl = process.env.DASHBOARD_URL_PROD || process.env.DASHBOARD_URL || 'http://localhost:3000';
        
        const welcomeEmbed = createEmbed(
          '👋 Hi! I\'m OcieBot!',
          `I help organize your OCs, yumeships, birthdays, prompts, and trivia!\n\n` +
          `**What I can do:**\n` +
          `• Manage OCs and their details\n` +
          `• Track birthdays and send announcements\n` +
          `• Character of the Week spotlights\n` +
          `• Question of the Day (QOTD)\n` +
          `• RP prompts and trivia games\n\n` +
          `**To set me up:**\n` +
          `• Use \`/ocie setup\` to start the setup wizard\n` +
          `• Use \`/ocie help\` to see all commands\n\n` +
          `**Dashboard:**\n` +
          `You can also manage everything via the web dashboard: ${dashboardUrl}\n\n` +
          `Let's get started! 💖`,
          COLORS.primary
        );
        
        await welcomeChannel.send({ embeds: [welcomeEmbed] });
        logger.success(`Sent welcome message to #${welcomeChannel.name} in ${guild.name}`);
      } else {
        logger.warn(`Could not find a suitable channel to send welcome message in ${guild.name}`);
      }
    } catch (error) {
      logger.warn(`Could not send welcome message to channel: ${error}`);
    }
  } catch (error) {
    logger.error(`Failed to initialize config for guild ${guild.id}: ${error}`);
  }
});

// Handle button interactions
async function handleButtonInteraction(interaction: ButtonInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ embeds: [createErrorEmbed('This interaction can only be used in a server!')], ephemeral: true });
    return;
  }

  const customId = interaction.customId;

  // Handle setup wizard buttons
  if (customId === 'setup_cancel') {
    const embed = createEmbed(
      '❌ Setup Cancelled',
      'Setup wizard has been cancelled. You can run `/ocie setup` again anytime to configure OcieBot!',
      COLORS.warning
    );
    
    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  if (customId === 'setup_start') {
    // Check permissions
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!hasManageServer(member)) {
      await interaction.reply({ 
        embeds: [createErrorEmbed('You need Manage Server permission to configure OcieBot!')], 
        ephemeral: true 
      });
      return;
    }

    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    
    const embed = createEmbed(
      '⚙️ OcieBot Setup Guide',
      '**Welcome! Here\'s how to configure OcieBot for your server:**\n\n' +
      
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      
      '**🎯 EASIEST WAY: Use the Dashboard**\n\n' +
      `**Step 1:** Open your web browser and go to:\n` +
      `**${dashboardUrl}**\n\n` +
      '**Step 2:** Click "Login with Discord" to sign in\n\n' +
      '**Step 3:** Once logged in, click on **"Settings"** in the left sidebar\n\n' +
      '**Step 4:** On the Settings page, you can:\n' +
      '• Choose which channels to use for different features\n' +
      '• Turn features on or off (birthdays, QOTD, prompts, etc.)\n' +
      '• Set your server\'s timezone\n' +
      '• Configure when automated features run\n\n' +
      '**That\'s it!** Everything is done through easy-to-use forms - no commands needed!\n\n' +
      
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      
      '**⌨️ ALTERNATIVE: Use Discord Commands**\n\n' +
      'If you prefer using commands in Discord, here\'s how:\n\n' +
      
      '**Setting Up Channels:**\n' +
      'Channels tell the bot where to post things. You can set:\n' +
      '• **COTW Channel** - Where "Character of the Week" posts appear\n' +
      '• **Birthdays Channel** - Where birthday announcements go\n' +
      '• **QOTD Channel** - Where "Question of the Day" is posted\n' +
      '• **Prompts Channel** - Where roleplay prompts are shared\n' +
      '• **Logs Channel** - Where bot activity logs are sent\n\n' +
      
      '**To set a channel using commands:**\n' +
      '1. Type `/ocie set` in any channel\n' +
      '2. For "type", select **"Channel"**\n' +
      '3. For "value", choose which type (cotw, birthdays, qotd, prompts, or logs)\n' +
      '4. For "channel", pick the Discord channel you want\n' +
      '5. Press Enter to save!\n\n' +
      
      '**Other Settings:**\n' +
      '• `/ocie set timezone <timezone>` - Set your server\'s timezone\n' +
      '  Example: `/ocie set timezone America/New_York`\n' +
      '• `/ocie feature <name> <enabled>` - Turn features on/off\n' +
      '  Example: `/ocie feature birthdays true`\n' +
      '• `/ocie settings` - See what you\'ve configured so far\n\n' +
      
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      
      '**💡 Quick Tips:**\n' +
      '• You don\'t need to set everything at once - configure as you go!\n' +
      '• The dashboard is usually easier if you\'re not familiar with Discord commands\n' +
      '• Use `/ocie help` anytime to see all available commands\n\n' +
      
      '**Need more help?** Check the dashboard or use `/ocie help`! 💖',
      COLORS.info
    );

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('View Settings')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('setup_view_settings'),
        new ButtonBuilder()
          .setLabel('Close')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('setup_close')
      );

    await interaction.update({ embeds: [embed], components: [row] });
    return;
  }

  if (customId === 'setup_view_settings') {
    const config = await getOrCreateServerConfig(interaction.guild.id);
    
    const embed = createEmbed('⚙️ Current Settings', undefined, COLORS.info);
    
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
      { name: '🌍 Timezone', value: config.timezone, inline: true }
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (customId === 'setup_close') {
    await interaction.update({ components: [] });
    return;
  }
}

// Connect to database and start bot
async function start() {
  logger.showBanner();
  logger.showStartupInfo();
  
  try {
    logger.info('Connecting to database...');
    await connectDatabase();
    logger.success('Database connected successfully!');
    
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      logger.error('DISCORD_BOT_TOKEN is not set in .env file');
      logger.error('Make sure the .env file exists in the project root and contains DISCORD_BOT_TOKEN');
      process.exit(1);
    }
    
    logger.info('Logging in to Discord...');
    await client.login(token);
  } catch (error) {
    logger.error(`Failed to start bot: ${error}`);
    if (error instanceof Error && error.message.includes('TokenInvalid')) {
      logger.error('Invalid Discord bot token!');
      logger.error('Please check your DISCORD_BOT_TOKEN in the .env file.');
      logger.error('You can get a new token from: https://discord.com/developers/applications');
      logger.error('Make sure to copy the token from the Bot section (not OAuth2).');
    }
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.warn('\n🛑 Shutting down gracefully...');
  await client.destroy();
  logger.success('Bot shutdown complete');
  process.exit(0);
});
