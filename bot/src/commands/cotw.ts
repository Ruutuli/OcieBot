import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { hasManageServer } from '../utils/permissions';
import { createErrorEmbed, COLORS } from '../utils/embeds';
import { getCurrentCOTW, getCOTWHistory, createCOTW } from '../modules/cotw';
import { getAllOCs, getOCById } from '../services/ocService';
import { formatOCCard } from '../utils/ocFormatter';
import { getServerConfig } from '../services/configService';
import { TextChannel } from 'discord.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('cotw')
    .setDescription('Character of the Week commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('current')
        .setDescription('View the current Character of the Week')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('View Character of the Week history')
        .addIntegerOption(option => option.setName('limit').setDescription('Number of entries to show').setMinValue(1).setMaxValue(50))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Reroll the Character of the Week (admin only)')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'current':
        await handleCurrent(interaction);
        break;
      case 'history':
        await handleHistory(interaction);
        break;
      case 'reroll':
        await handleReroll(interaction);
        break;
    }
  }
};

async function handleCurrent(interaction: ChatInputCommandInteraction) {
  const cotw = await getCurrentCOTW(interaction.guild!.id);
  
  if (!cotw) {
    await interaction.reply({ embeds: [createErrorEmbed('No Character of the Week has been selected yet this week.')], ephemeral: true });
    return;
  }

  const oc = await getOCById(cotw.ocId.toString());
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed('OC not found.')], ephemeral: true });
    return;
  }

  const embed = formatOCCard(oc);
  embed.setTitle(`💫 Current Character of the Week: ${oc.name}`);
  embed.setDescription(`This week's featured OC! Share art, facts, or anything about ${oc.name}! ✨`);
  embed.setFooter({ text: `Selected on ${cotw.date.toLocaleDateString()}` });

  await interaction.reply({ embeds: [embed] });
}

async function handleHistory(interaction: ChatInputCommandInteraction) {
  const limit = interaction.options.getInteger('limit') || 20;
  const history = await getCOTWHistory(interaction.guild!.id, limit);

  if (history.length === 0) {
    await interaction.reply({ embeds: [createErrorEmbed('No Character of the Week history found.')], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`💫 Character of the Week History`)
    .setColor(COLORS.info);

  const historyText = await Promise.all(history.map(async (cotw) => {
    const oc = await getOCById(cotw.ocId.toString());
    if (!oc) return `Unknown OC - ${cotw.date.toLocaleDateString()}`;
    return `**${oc.name}** (${oc.fandom}) - ${cotw.date.toLocaleDateString()}`;
  }));

  embed.setDescription(historyText.join('\n'));

  await interaction.reply({ embeds: [embed] });
}

async function handleReroll(interaction: ChatInputCommandInteraction) {
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  if (!hasManageServer(member)) {
    await interaction.reply({ embeds: [createErrorEmbed('You need Manage Server permission to reroll COTW!')], ephemeral: true });
    return;
  }

  const config = await getServerConfig(interaction.guild!.id);
  if (!config || !config.features.cotw || !config.channels.cotw) {
    await interaction.reply({ embeds: [createErrorEmbed('COTW is not configured for this server.')], ephemeral: true });
    return;
  }

  const channel = await interaction.guild!.channels.fetch(config.channels.cotw) as TextChannel;
  if (!channel) {
    await interaction.reply({ embeds: [createErrorEmbed('COTW channel not found.')], ephemeral: true });
    return;
  }

  // Get all OCs
  const ocs = await getAllOCs(interaction.guild!.id);
  if (ocs.length === 0) {
    await interaction.reply({ embeds: [createErrorEmbed('No OCs found in this server!')], ephemeral: true });
    return;
  }

  // Get recently spotlighted (last 4 weeks)
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentHistory = await getCOTWHistory(interaction.guild!.id, 100);
  const recentOCIds = recentHistory
    .filter(cotw => cotw.date >= fourWeeksAgo)
    .map(cotw => cotw.ocId.toString());

  const availableOCs = ocs.filter(oc => !recentOCIds.includes(oc._id.toString()));
  const pool = availableOCs.length > 0 ? availableOCs : ocs;

  // Select random OC
  const randomOC = pool[Math.floor(Math.random() * pool.length)];

  // Create COTW embed
  const embed = formatOCCard(randomOC);
  embed.setTitle(`💫 Character of the Week: ${randomOC.name}`);
  embed.setDescription(`This week's featured OC! Share art, facts, or anything about ${randomOC.name}! ✨`);
  embed.setColor(COLORS.primary);
  embed.setFooter({ text: 'Rerolled by admin' });

  await channel.send({ embeds: [embed] });

  // Log the COTW
  await createCOTW(interaction.guild!.id, randomOC._id.toString(), channel.id);

  await interaction.reply({ embeds: [createErrorEmbed(`Rerolled Character of the Week to ${randomOC.name}!`)], ephemeral: true });
}

export default command;

