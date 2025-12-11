import { Client, GatewayIntentBits, Events, Interaction, Guild, TextChannel, AuditLogEvent, ChannelType, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from './database/connection';
import { loadCommands, registerCommands, registerCommandsForGuild, clearGlobalCommands, Command } from './utils/commandHandler';
import { Collection } from 'discord.js';
import { startBirthdayScheduler } from './modules/birthday';
import { startCOTWScheduler } from './modules/cotw';
import { startQOTDScheduler } from './modules/qotd';
import { startPromptsScheduler } from './modules/prompts';
import { logger } from './utils/logger';
import { getOrCreateServerConfig } from './services/configService';
import { createEmbed, createErrorEmbed, createSuccessEmbed, COLORS } from './utils/embeds';
import { hasManageServer } from './utils/permissions';
import { getOCByName } from './services/ocService';

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
  startPromptsScheduler(client);
  
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

// Handle messages for OC posting (ocname: text format)
client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore bot messages and DMs
  if (message.author.bot || !message.guild || !message.channel.isTextBased()) {
    return;
  }

  // Ignore commands (messages starting with /)
  if (message.content.startsWith('/')) {
    return;
  }

  // Check if message matches the pattern: ocname: text
  const match = message.content.match(/^([^:]+):\s*(.+)$/s);
  if (!match) {
    return;
  }

  const [, ocName, messageText] = match;
  const trimmedOcName = ocName.trim();
  const trimmedMessage = messageText.trim();

  // Don't process if message text is empty
  if (!trimmedMessage) {
    return;
  }

  try {
    // Look up OC by name and owner
    const oc = await getOCByName(message.guild.id, trimmedOcName);
    
    if (!oc) {
      // OC not found - silently ignore (don't spam errors)
      return;
    }

    // Check if the OC belongs to the message author
    if (oc.ownerId !== message.author.id) {
      // OC doesn't belong to this user - silently ignore
      return;
    }

    // Get or create webhook for this channel
    const channel = message.channel as TextChannel;
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find(w => w.name === 'OcieBot OC Proxy');

    if (!webhook) {
      // Create webhook if it doesn't exist
      try {
        webhook = await channel.createWebhook({
          name: 'OcieBot OC Proxy',
          avatar: client.user?.displayAvatarURL(),
          reason: 'OC proxy posting feature'
        });
      } catch (error) {
        logger.error(`Failed to create webhook in channel ${channel.id}: ${error}`);
        return;
      }
    }

    // Prepare webhook avatar (use OC image if available, otherwise use a default)
    const avatarUrl = oc.imageUrl || undefined;

    // Post message as OC via webhook
    await webhook.send({
      content: trimmedMessage,
      username: oc.name,
      avatarURL: avatarUrl,
      allowedMentions: {
        parse: ['users', 'roles', 'everyone']
      }
    });

    // Delete the original message
    try {
      await message.delete();
    } catch (error) {
      logger.warn(`Failed to delete original message ${message.id}: ${error}`);
      // Continue even if deletion fails
    }
  } catch (error) {
    logger.error(`Error processing OC message: ${error}`);
    // Silently fail to avoid spamming errors
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

// Handle help pagination
async function handleHelpPagination(interaction: ButtonInteraction, customId: string) {
  if (!interaction.guild) {
    await interaction.reply({ embeds: [createErrorEmbed('This interaction can only be used in a server!')], ephemeral: true });
    return;
  }

  const config = await getOrCreateServerConfig(interaction.guild.id);
  let currentPage = 1;

  // Determine current page from message if it exists
  if (interaction.message && interaction.message.embeds && interaction.message.embeds.length > 0) {
    const footer = interaction.message.embeds[0].footer?.text || '';
    if (footer.includes('Page 2')) {
      currentPage = 2;
    }
  }

  // Determine target page
  if (customId === 'help_page_1') {
    currentPage = 1;
  } else if (customId === 'help_page_2') {
    currentPage = 2;
  } else if (customId === 'help_next') {
    currentPage = currentPage === 1 ? 2 : 1;
  } else if (customId === 'help_prev') {
    currentPage = currentPage === 2 ? 1 : 2;
  }

  // Page 1: How to Use
  const page1Embed = createEmbed(
    '✨ OcieBot Help - How to Use',
    '**Welcome! 👋** OcieBot is here to help you organize your OCs, yumeships, birthdays, prompts, and trivia!\n\n' +
    'If you\'re new to Discord bots, don\'t worry - we\'ll walk you through everything step by step. 💖'
  );
  
  page1Embed.addFields(
    { 
      name: '🤖 What is a Discord Bot?', 
      value: 'A bot is like a helpful assistant in your Discord server. You can talk to it using special commands (they start with `/`). ' +
      'Just type `/` in any channel and you\'ll see a list of commands you can use!', 
      inline: false 
    },
    { 
      name: '📝 How to Use Commands', 
      value: '**Step 1:** Type `/` in any channel\n' +
      '**Step 2:** Look for "ocie" or other commands in the list\n' +
      '**Step 3:** Click on a command to see what it does\n' +
      '**Step 4:** Fill in any required information (like names or options)\n' +
      '**Step 5:** Press Enter or click the command to send it!\n\n' +
      '💡 **Tip:** You can click on the command suggestions to see what each option does!', 
      inline: false 
    },
    { 
      name: '🎯 Getting Started - What Can I Do?', 
      value: '**For Everyone:**\n' +
      '• `/oc add` - Add your OC (Original Character)\n' +
      '• `/birthday set` - Set when your OC\'s birthday is\n' +
      '• `/qotd ask` - Get a fun question to answer\n' +
      '• `/prompt random` - Get a random roleplay prompt\n' +
      '• `/trivia play` - Play trivia games about OCs\n\n' +
      '**💬 Post as Your OC:**\n' +
      'Type `OCName: your message` to post as your OC! (Similar to Tupperbox)\n' +
      'Example: `Alice: Hello everyone!`\n\n' +
      '**For Server Admins:**\n' +
      '• `/ocie setup` - Set up the bot for your server\n' +
      '• `/ocie settings` - See what\'s configured\n\n' +
      'Use the buttons below to see more pages! ➡️', 
      inline: false 
    },
    { 
      name: '❓ Need More Help?', 
      value: '• Check the next page to see all available channels and features\n' +
      '• Ask a server admin if you\'re not sure about something\n' +
      '• Most commands are easy to try - just experiment and see what happens!', 
      inline: false 
    }
  );
  
  page1Embed.setFooter({ text: 'Page 1 of 2 • Use the buttons below to navigate' });

  // Page 2: All Channels
  const page2Embed = createEmbed(
    '📺 OcieBot Help - All Channels & Features',
    'Here\'s everything OcieBot can do! Channels tell the bot where to post things, and features are what the bot can help you with.'
  );
  
  page2Embed.addFields(
    { 
      name: '📺 Configured Channels', 
      value: `**Character of the Week (COTW):** ${config.channels.cotw ? `<#${config.channels.cotw}>` : '❌ Not set'}\n` +
      `• Where the featured character of the week is posted\n\n` +
      `**Birthdays:** ${config.channels.birthdays ? `<#${config.channels.birthdays}>` : '❌ Not set'}\n` +
      `• Where birthday announcements are posted\n\n` +
      `**Question of the Day (QOTD):** ${config.channels.qotd ? `<#${config.channels.qotd}>` : '❌ Not set'}\n` +
      `• Where daily questions are posted\n\n` +
      `**Prompts:** ${config.channels.prompts ? `<#${config.channels.prompts}>` : '❌ Not set'}\n` +
      `• Where roleplay prompts are shared\n\n` +
      `**Logs:** ${config.channels.logs ? `<#${config.channels.logs}>` : '❌ Not set'}\n` +
      `• Where bot activity is logged (admin only)`, 
      inline: false 
    },
    { 
      name: '✨ All Available Features', 
      value: '**✨ OC Management**\n' +
      '`/oc add` - Add a new OC\n' +
      '`/oc edit` - Edit an OC\n' +
      '`/oc delete` - Delete an OC\n' +
      '`/oc view` - View an OC card\n' +
      '`/oc list` - List all OCs\n' +
      '`/oc random` - Get a random OC\n\n' +
      '**💬 Post as Your OC**\n' +
      'Type `OCName: your message` in any channel to post as your OC!\n' +
      'The bot will replace your message with one posted as your OC.\n' +
      'Example: `Alice: Hello! How is everyone?`\n\n' +
      '**🎂 Birthdays**\n' +
      '`/birthday set` - Set OC birthday\n' +
      '`/birthday list` - List all birthdays\n' +
      '`/birthday month` - Birthdays this month\n' +
      '`/birthday today` - Birthdays today\n\n' +
      '**💫 Character of the Week**\n' +
      '`/cotw current` - View current COTW\n' +
      '`/cotw history` - View COTW history\n' +
      '`/cotw reroll` - Reroll COTW (admin)', 
      inline: false 
    },
    { 
      name: '✨ More Features (continued)', 
      value: '**💭 Question of the Day**\n' +
      '`/qotd add` - Add a QOTD\n' +
      '`/qotd ask` - Ask a random QOTD\n' +
      '`/qotd list` - List all QOTDs\n\n' +
      '**🎭 Prompts**\n' +
      '`/prompt add` - Add a prompt\n' +
      '`/prompt random` - Get random prompt\n' +
      '`/prompt use` - Post a prompt\n\n' +
      '**🧠 Trivia**\n' +
      '`/trivia add` - Add trivia question\n' +
      '`/trivia play` - Start trivia game\n' +
      '`/trivia answer <oc>` - Answer trivia\n' +
      '`/trivia list` - List all trivia\n' +
      '`/trivia remove <id>` - Remove trivia\n\n' +
      '**📚 Fandoms**\n' +
      '`/fandom directory` - List all fandoms\n' +
      '`/fandom info` - Get fandom info\n\n' +
      '**📊 Stats**\n' +
      '`/stats` - View server statistics', 
      inline: false 
    }
  );
  
  page2Embed.setFooter({ text: 'Page 2 of 2 • Use the buttons below to navigate' });

  // Create navigation buttons
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('help_prev')
        .setLabel('⬅️ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('help_page_1')
        .setLabel('How to Use')
        .setStyle(currentPage === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help_page_2')
        .setLabel('All Channels')
        .setStyle(currentPage === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help_next')
        .setLabel('Next ➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 2)
    );

  const targetEmbed = currentPage === 1 ? page1Embed : page2Embed;
  
  await interaction.update({ embeds: [targetEmbed], components: [row] });
}

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

  // Handle help pagination
  if (customId.startsWith('help_')) {
    await handleHelpPagination(interaction, customId);
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
