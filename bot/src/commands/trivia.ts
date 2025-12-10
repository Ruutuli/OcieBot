import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { hasManageServer } from '../utils/permissions';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { createTrivia, getTriviaByGuild, getRandomTrivia, deleteTrivia, getTriviaById } from '../services/triviaService';
import { startTriviaGame, getActiveGame, endTriviaGame, submitAnswer, checkAnswer } from '../services/triviaGame';
import { getOCByName, getAllOCs, getRandomOC } from '../services/ocService';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Manage OC trivia facts')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a trivia fact about an OC')
        .addStringOption(option => option.setName('fact').setDescription('The trivia fact').setRequired(true))
        .addStringOption(option => option.setName('oc_name').setDescription('The OC this fact is about').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a trivia fact')
        .addStringOption(option => option.setName('id').setDescription('Trivia ID').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all trivia facts')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a trivia game - guess which OC the fact belongs to!')
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
      case 'start':
        await handleStart(interaction);
        break;
    }
  }
};

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const fact = interaction.options.getString('fact', true);
  const ocName = interaction.options.getString('oc_name', true);

  const oc = await getOCByName(interaction.guild!.id, ocName);
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" not found!`)], ephemeral: true });
    return;
  }

  try {
    const trivia = await createTrivia({
      guildId: interaction.guild!.id,
      fact,
      ocId: oc._id.toString(),
      createdById: interaction.user.id
    });

    await interaction.reply({
      embeds: [createSuccessEmbed(`Added trivia fact about **${oc.name}**:\n"${fact}"\n\nID: \`${trivia._id}\``)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error adding trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to add trivia.')], ephemeral: true });
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  const member = await interaction.guild!.members.fetch(interaction.user.id);

  const trivia = await getTriviaById(id);
  if (!trivia) {
    await interaction.reply({ embeds: [createErrorEmbed('Trivia not found!')], ephemeral: true });
    return;
  }

  if (trivia.guildId !== interaction.guild!.id) {
    await interaction.reply({ embeds: [createErrorEmbed('Trivia not found in this server!')], ephemeral: true });
    return;
  }

  if (trivia.createdById !== interaction.user.id && !hasManageServer(member)) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only remove your own trivia!')], ephemeral: true });
    return;
  }

  try {
    await deleteTrivia(id);
    await interaction.reply({ embeds: [createSuccessEmbed('Trivia removed!')], ephemeral: true });
  } catch (error) {
    console.error('Error removing trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to remove trivia.')], ephemeral: true });
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  try {
    const trivias = await getTriviaByGuild(interaction.guild!.id);

    if (trivias.length === 0) {
      await interaction.reply({ embeds: [createErrorEmbed('No trivia found.')], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🧠 Trivia Facts List')
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setDescription(trivias.slice(0, 20).map((t, i) => {
        const oc = (t.ocId as any)?.name || 'Unknown OC';
        return `${i + 1}. **${t.fact}**\n   OC: ${oc} | ID: \`${t._id}\``;
      }).join('\n\n'));

    if (trivias.length > 20) {
      embed.setFooter({ text: `Showing 20 of ${trivias.length} trivia facts` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error listing trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to list trivia.')], ephemeral: true });
  }
}

async function handleStart(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getString('category') as 'OC Trivia' | 'Fandom Trivia' | 'Yume Trivia' | null;

  // Check if there's already an active game
  const activeGame = getActiveGame(interaction.guild!.id, interaction.channel!.id);
  if (activeGame) {
    await interaction.reply({ embeds: [createErrorEmbed('There is already an active trivia game in this channel!')], ephemeral: true });
    return;
  }

  try {
    const trivia = await getRandomTrivia(interaction.guild!.id, category || undefined);

    if (!trivia) {
      await interaction.reply({ embeds: [createErrorEmbed('No trivia found!')], ephemeral: true });
      return;
    }

    const game = startTriviaGame(interaction.guild!.id, interaction.channel!.id, trivia);

    const embed = new EmbedBuilder()
      .setTitle('🧠 Trivia Time!')
      .setDescription(trivia.question)
      .setColor(COLORS.secondary)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .addFields({ name: 'Category', value: trivia.category, inline: true })
      .setFooter({ text: 'Use /trivia answer to submit your answer!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Auto-end after 5 minutes
    setTimeout(() => {
      const currentGame = getActiveGame(interaction.guild!.id, interaction.channel!.id);
      if (currentGame && currentGame.question._id.toString() === trivia._id.toString()) {
        endTriviaGame(interaction.guild!.id, interaction.channel!.id);
        const endEmbed = new EmbedBuilder()
          .setTitle('⏰ Trivia Time\'s Up!')
          .setDescription(`The answer was: **${trivia.answer}**`)
          .setColor(COLORS.warning)
          .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');
        interaction.channel!.send({ embeds: [endEmbed] });
      }
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Error starting trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to start trivia.')], ephemeral: true });
  }
}

async function handleAnswer(interaction: ChatInputCommandInteraction) {
  const userAnswer = interaction.options.getString('answer', true);

  const game = getActiveGame(interaction.guild!.id, interaction.channel!.id);
  if (!game) {
    await interaction.reply({ embeds: [createErrorEmbed('There is no active trivia game in this channel!')], ephemeral: true });
    return;
  }

  if (!submitAnswer(interaction.guild!.id, interaction.channel!.id, interaction.user.id)) {
    await interaction.reply({ embeds: [createErrorEmbed('You have already answered this question!')], ephemeral: true });
    return;
  }

  const isCorrect = checkAnswer(game, userAnswer);

  if (isCorrect) {
    const timeTaken = (new Date().getTime() - game.startTime.getTime()) / 1000;
    const embed = new EmbedBuilder()
      .setTitle('🎉 Correct!')
      .setDescription(`**${interaction.user.tag}** got it right!\nAnswer: **${game.question.answer}**\nTime: ${timeTaken.toFixed(1)}s`)
      .setColor(COLORS.success)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');

    await interaction.reply({ embeds: [embed] });
    endTriviaGame(interaction.guild!.id, interaction.channel!.id);
  } else {
    await interaction.reply({ embeds: [createErrorEmbed('Incorrect! Try again.')], ephemeral: true });
  }
}

export default command;

