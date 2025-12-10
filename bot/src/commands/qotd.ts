import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { hasManageServer } from '../utils/permissions';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { createQOTD, getQOTDsByGuild, getRandomQOTD, deleteQOTD, incrementQOTDUse, getQOTDById } from '../services/qotdService';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('qotd')
    .setDescription('Manage Questions of the Day')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new QOTD')
        .addStringOption(option => option.setName('question').setDescription('The question').setRequired(true))
        .addStringOption(option => option.setName('category').setDescription('Category')
          .addChoices(
            { name: 'OC General', value: 'OC General' },
            { name: 'Worldbuilding', value: 'Worldbuilding' },
            { name: 'Yume', value: 'Yume' },
            { name: 'Misc', value: 'Misc' }
          ))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a QOTD')
        .addStringOption(option => option.setName('id').setDescription('QOTD ID').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all QOTDs')
        .addStringOption(option => option.setName('category').setDescription('Filter by category')
          .addChoices(
            { name: 'OC General', value: 'OC General' },
            { name: 'Worldbuilding', value: 'Worldbuilding' },
            { name: 'Yume', value: 'Yume' },
            { name: 'Misc', value: 'Misc' }
          ))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ask')
        .setDescription('Ask a random QOTD')
        .addStringOption(option => option.setName('category').setDescription('Filter by category')
          .addChoices(
            { name: 'OC General', value: 'OC General' },
            { name: 'Worldbuilding', value: 'Worldbuilding' },
            { name: 'Yume', value: 'Yume' },
            { name: 'Misc', value: 'Misc' }
          ))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        await handleAdd(interaction);
        break;
      case 'remove':
        await handleRemove(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      case 'ask':
        await handleAsk(interaction);
        break;
    }
  }
};

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString('question', true);
  const category = (interaction.options.getString('category') || 'Misc') as 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc';

  try {
    const qotd = await createQOTD({
      guildId: interaction.guild!.id,
      question,
      category,
      createdById: interaction.user.id
    });

    await interaction.reply({
      embeds: [createSuccessEmbed(`Added QOTD: "${question}"\nCategory: ${category}\nID: ${qotd._id}`)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error adding QOTD:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to add QOTD.')], ephemeral: true });
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  const member = await interaction.guild!.members.fetch(interaction.user.id);

  const qotd = await getQOTDById(id);
  if (!qotd) {
    await interaction.reply({ embeds: [createErrorEmbed('QOTD not found!')], ephemeral: true });
    return;
  }

  if (qotd.guildId !== interaction.guild!.id) {
    await interaction.reply({ embeds: [createErrorEmbed('QOTD not found in this server!')], ephemeral: true });
    return;
  }

  if (qotd.createdById !== interaction.user.id && !hasManageServer(member)) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only remove your own QOTDs!')], ephemeral: true });
    return;
  }

  try {
    await deleteQOTD(id);
    await interaction.reply({ embeds: [createSuccessEmbed('QOTD removed!')], ephemeral: true });
  } catch (error) {
    console.error('Error removing QOTD:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to remove QOTD.')], ephemeral: true });
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getString('category') as 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc' | null;

  try {
    const qotds = await getQOTDsByGuild(interaction.guild!.id, category || undefined);

    if (qotds.length === 0) {
      await interaction.reply({ embeds: [createErrorEmbed('No QOTDs found.')], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`💭 QOTD List${category ? ` (${category})` : ''}`)
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setDescription(qotds.slice(0, 20).map((q, i) => 
        `${i + 1}. **${q.question}** (${q.category}${q.fandom ? ` • ${q.fandom}` : ''}) - Used ${q.timesUsed}x\n   ID: \`${q._id}\``
      ).join('\n\n'));

    if (qotds.length > 20) {
      embed.setFooter({ text: `Showing 20 of ${qotds.length} QOTDs` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error listing QOTDs:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to list QOTDs.')], ephemeral: true });
  }
}

async function handleAsk(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getString('category') as 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc' | null;

  try {
    const qotd = await getRandomQOTD(interaction.guild!.id, category || undefined);

    if (!qotd) {
      await interaction.reply({ embeds: [createErrorEmbed('No QOTDs found!')], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`💭 QOTD | ${qotd.category}`)
      .setDescription(qotd.question)
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');
    
    if (qotd.fandom) {
      embed.addFields({ name: 'Fandom', value: qotd.fandom, inline: false });
    }
    
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Increment usage
    await incrementQOTDUse(qotd._id.toString());
  } catch (error) {
    console.error('Error asking QOTD:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to get QOTD.')], ephemeral: true });
  }
}

export default command;

