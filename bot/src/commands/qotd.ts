import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { createQOTD, getQOTDsByGuild, getRandomQOTD, deleteQOTD, incrementQOTDUse, getQOTDById, updateQOTD } from '../services/qotdService';

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
        .addStringOption(option => option.setName('fandom').setDescription('Fandom (optional)'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit a QOTD you created')
        .addStringOption(option => option.setName('id').setDescription('QOTD ID').setRequired(true).setAutocomplete(true))
        .addStringOption(option => option.setName('question').setDescription('New question text').setRequired(true))
        .addStringOption(option => option.setName('category').setDescription('Category')
          .addChoices(
            { name: 'OC General', value: 'OC General' },
            { name: 'Worldbuilding', value: 'Worldbuilding' },
            { name: 'Yume', value: 'Yume' },
            { name: 'Misc', value: 'Misc' }
          ))
        .addStringOption(option => option.setName('fandom').setDescription('Fandom (optional, leave empty to clear)'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a QOTD')
        .addStringOption(option => option.setName('id').setDescription('QOTD ID').setRequired(true).setAutocomplete(true))
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
      case 'edit':
        await handleEdit(interaction);
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
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guild) {
      await interaction.respond([]);
      return;
    }

    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'id') {
      try {
        const qotds = await getQOTDsByGuild(interaction.guild.id);
        const focusedValue = focusedOption.value.toLowerCase();
        
        const choices = qotds
          .filter(q => {
            const idStr = (q.id || q._id.toString()).toLowerCase();
            const questionStr = q.question.toLowerCase();
            return idStr.includes(focusedValue) || questionStr.includes(focusedValue);
          })
          .slice(0, 25)
          .map(q => {
            const questionPreview = q.question.length > 80 ? q.question.substring(0, 77) + '...' : q.question;
            const displayId = q.id || q._id.toString().substring(0, 8);
            return {
              name: `${displayId} - ${questionPreview}`,
              value: q.id || q._id.toString()
            };
          });

        await interaction.respond(choices);
      } catch (error) {
        console.error('Error in autocomplete:', error);
        await interaction.respond([]);
      }
    } else {
      await interaction.respond([]);
    }
  }
};

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString('question', true);
  const category = (interaction.options.getString('category') || 'Misc') as 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc';
  const fandom = interaction.options.getString('fandom');

  try {
    const qotdData: any = {
      guildId: interaction.guild!.id,
      question,
      category,
      createdById: interaction.user.id
    };
    if (fandom && fandom.trim() !== '') {
      qotdData.fandom = fandom.trim();
    }
    const qotd = await createQOTD(qotdData);

    let responseText = `Added QOTD: "${question}"\nCategory: ${category}`;
    if (qotd.fandom) {
      responseText += `\nFandom: ${qotd.fandom}`;
    }
    responseText += `\nID: ${qotd.id || qotd._id}`;

    await interaction.reply({
      embeds: [createSuccessEmbed(responseText)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error adding QOTD:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to add QOTD.')], ephemeral: true });
  }
}

async function handleEdit(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  const question = interaction.options.getString('question', true);
  const category = interaction.options.getString('category') as 'OC General' | 'Worldbuilding' | 'Yume' | 'Misc' | null;
  const fandom = interaction.options.getString('fandom');

  const qotd = await getQOTDById(id);
  if (!qotd) {
    await interaction.reply({ embeds: [createErrorEmbed('QOTD not found!')], ephemeral: true });
    return;
  }

  if (qotd.guildId !== interaction.guild!.id) {
    await interaction.reply({ embeds: [createErrorEmbed('QOTD not found in this server!')], ephemeral: true });
    return;
  }

  if (qotd.createdById !== interaction.user.id) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only edit your own QOTDs!')], ephemeral: true });
    return;
  }

  try {
    const updateData: any = { question };
    if (category) {
      updateData.category = category;
    }
    if (fandom !== null) {
      updateData.fandom = fandom && fandom.trim() !== '' ? fandom.trim() : null;
    }
    const updatedQOTD = await updateQOTD(id, updateData);

    let responseText = `Updated QOTD: "${updatedQOTD.question}"\nCategory: ${updatedQOTD.category}`;
    if (updatedQOTD.fandom) {
      responseText += `\nFandom: ${updatedQOTD.fandom}`;
    }
    responseText += `\nID: ${updatedQOTD.id || updatedQOTD._id}`;

    await interaction.reply({
      embeds: [createSuccessEmbed(responseText)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error updating QOTD:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to update QOTD.')], ephemeral: true });
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);

  const qotd = await getQOTDById(id);
  if (!qotd) {
    await interaction.reply({ embeds: [createErrorEmbed('QOTD not found!')], ephemeral: true });
    return;
  }

  if (qotd.guildId !== interaction.guild!.id) {
    await interaction.reply({ embeds: [createErrorEmbed('QOTD not found in this server!')], ephemeral: true });
    return;
  }

  if (qotd.createdById !== interaction.user.id) {
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
        `${i + 1}. **${q.question}** (${q.category}${q.fandom ? ` • ${q.fandom}` : ''}) - Used ${q.timesUsed}x\n   ID: \`${q.id || q._id}\``
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
      .setDescription(qotd.question.length > 4096 ? qotd.question.substring(0, 4093) + '...' : qotd.question)
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .addFields({ name: 'QOTD ID', value: qotd.id || qotd._id.toString(), inline: false });
    
    if (qotd.fandom) {
      embed.addFields({ name: 'Fandom', value: qotd.fandom, inline: false });
    }
    
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Increment usage
    await incrementQOTDUse(qotd.id || qotd._id.toString());
  } catch (error) {
    console.error('Error asking QOTD:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to get QOTD.')], ephemeral: true });
  }
}

export default command;

