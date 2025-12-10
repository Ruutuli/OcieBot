import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { getOCByName, getAllOCs } from '../services/ocService';
import { updateOC } from '../services/ocService';
import { BirthdayLog } from '../database/models/BirthdayLog';
import { formatInTimeZone } from 'date-fns-tz';
import { getServerConfig } from '../services/configService';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Manage OC birthdays')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set an OC\'s birthday')
        .addStringOption(option => option.setName('oc_name').setDescription('OC name').setRequired(true))
        .addStringOption(option => option.setName('date').setDescription('Birthday (MM-DD)').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear an OC\'s birthday')
        .addStringOption(option => option.setName('oc_name').setDescription('OC name').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all birthdays')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('month')
        .setDescription('List birthdays this month')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('today')
        .setDescription('List birthdays today')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'set':
        await handleSet(interaction);
        break;
      case 'clear':
        await handleClear(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      case 'month':
        await handleMonth(interaction);
        break;
      case 'today':
        await handleToday(interaction);
        break;
    }
  }
};

async function handleSet(interaction: ChatInputCommandInteraction) {
  const ocName = interaction.options.getString('oc_name', true);
  const date = interaction.options.getString('date', true);

  if (!/^\d{2}-\d{2}$/.test(date)) {
    await interaction.reply({ embeds: [createErrorEmbed('Birthday must be in MM-DD format (e.g., 03-15)')], ephemeral: true });
    return;
  }

  const oc = await getOCByName(interaction.guild!.id, ocName);
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" not found!`)], ephemeral: true });
    return;
  }

  if (oc.ownerId !== interaction.user.id) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only set birthdays for your own OCs!')], ephemeral: true });
    return;
  }

  try {
    await updateOC(oc._id.toString(), { birthday: date });
    await interaction.reply({ embeds: [createSuccessEmbed(`Set ${ocName}'s birthday to ${date}`)], ephemeral: true });
  } catch (error) {
    console.error('Error setting birthday:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to set birthday.')], ephemeral: true });
  }
}

async function handleClear(interaction: ChatInputCommandInteraction) {
  const ocName = interaction.options.getString('oc_name', true);

  const oc = await getOCByName(interaction.guild!.id, ocName);
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" not found!`)], ephemeral: true });
    return;
  }

  if (oc.ownerId !== interaction.user.id) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only clear birthdays for your own OCs!')], ephemeral: true });
    return;
  }

  try {
    await updateOC(oc._id.toString(), { birthday: undefined });
    await interaction.reply({ embeds: [createSuccessEmbed(`Cleared ${ocName}'s birthday`)], ephemeral: true });
  } catch (error) {
    console.error('Error clearing birthday:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to clear birthday.')], ephemeral: true });
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const ocs = await getAllOCs(interaction.guild!.id);
  const withBirthdays = ocs.filter(oc => oc.birthday).sort((a, b) => {
    if (!a.birthday || !b.birthday) return 0;
    return a.birthday.localeCompare(b.birthday);
  });

  if (withBirthdays.length === 0) {
    await interaction.reply({ embeds: [createErrorEmbed('No OCs with birthdays set.')], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎂 All Birthdays')
    .setDescription(withBirthdays.map(oc => `**${oc.name}** - ${oc.birthday} (${oc.fandom})`).join('\n'))
    .setColor(COLORS.secondary);

  await interaction.reply({ embeds: [embed] });
}

async function handleMonth(interaction: ChatInputCommandInteraction) {
  const config = await getServerConfig(interaction.guild!.id);
  const timezone = config?.timezone || 'America/New_York';
  const now = new Date();
  const currentMonth = formatInTimeZone(now, timezone, 'MM');

  const ocs = await getAllOCs(interaction.guild!.id);
  const thisMonth = ocs.filter(oc => {
    if (!oc.birthday) return false;
    const [month] = oc.birthday.split('-');
    return month === currentMonth;
  }).sort((a, b) => {
    if (!a.birthday || !b.birthday) return 0;
    return a.birthday.localeCompare(b.birthday);
  });

  if (thisMonth.length === 0) {
    await interaction.reply({ embeds: [createErrorEmbed('No birthdays this month.')], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎂 Birthdays This Month (${currentMonth})`)
    .setDescription(thisMonth.map(oc => `**${oc.name}** - ${oc.birthday} (${oc.fandom})`).join('\n'))
    .setColor(COLORS.secondary);

  await interaction.reply({ embeds: [embed] });
}

async function handleToday(interaction: ChatInputCommandInteraction) {
  const config = await getServerConfig(interaction.guild!.id);
  const timezone = config?.timezone || 'America/New_York';
  const now = new Date();
  const today = formatInTimeZone(now, timezone, 'MM-dd');

  const ocs = await getAllOCs(interaction.guild!.id);
  const todayOCs = ocs.filter(oc => oc.birthday === today);

  if (todayOCs.length === 0) {
    await interaction.reply({ embeds: [createErrorEmbed('No birthdays today.')], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎉 Birthdays Today!')
    .setDescription(todayOCs.map(oc => `**${oc.name}** (${oc.fandom}) - <@${oc.ownerId}>`).join('\n'))
    .setColor(COLORS.success);

  await interaction.reply({ embeds: [embed] });
}

export default command;

