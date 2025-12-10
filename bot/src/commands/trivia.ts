import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { hasManageServer } from '../utils/permissions';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { createTrivia, getTriviaByGuild, getRandomTrivia, deleteTrivia, getTriviaById } from '../services/triviaService';
import { startTriviaGame, getActiveGame, endTriviaGame, submitAnswer, checkAnswer } from '../services/triviaGame';
import { getOCByName } from '../services/ocService';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Manage trivia questions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new trivia question')
        .addStringOption(option => option.setName('question').setDescription('The question').setRequired(true))
        .addStringOption(option => option.setName('answer').setDescription('The answer').setRequired(true))
        .addStringOption(option => option.setName('category').setDescription('Category').setRequired(true)
          .addChoices(
            { name: 'OC Trivia', value: 'OC Trivia' },
            { name: 'Fandom Trivia', value: 'Fandom Trivia' },
            { name: 'Yume Trivia', value: 'Yume Trivia' }
          ))
        .addStringOption(option => option.setName('oc_name').setDescription('OC name (for OC Trivia)'))
        .addStringOption(option => option.setName('fandom').setDescription('Fandom (for Fandom Trivia)'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a trivia question')
        .addStringOption(option => option.setName('id').setDescription('Trivia ID').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all trivia questions')
        .addStringOption(option => option.setName('category').setDescription('Filter by category')
          .addChoices(
            { name: 'OC Trivia', value: 'OC Trivia' },
            { name: 'Fandom Trivia', value: 'Fandom Trivia' },
            { name: 'Yume Trivia', value: 'Yume Trivia' }
          ))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a trivia game')
        .addStringOption(option => option.setName('category').setDescription('Filter by category')
          .addChoices(
            { name: 'OC Trivia', value: 'OC Trivia' },
            { name: 'Fandom Trivia', value: 'Fandom Trivia' },
            { name: 'Yume Trivia', value: 'Yume Trivia' }
          ))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('answer')
        .setDescription('Answer the current trivia question')
        .addStringOption(option => option.setName('answer').setDescription('Your answer').setRequired(true))
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
      case 'answer':
        await handleAnswer(interaction);
        break;
    }
  }
};

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString('question', true);
  const answer = interaction.options.getString('answer', true);
  const category = interaction.options.getString('category', true) as 'OC Trivia' | 'Fandom Trivia' | 'Yume Trivia';
  const ocName = interaction.options.getString('oc_name');
  const fandom = interaction.options.getString('fandom');

  let ocId: string | undefined;
  if (category === 'OC Trivia' && ocName) {
    const oc = await getOCByName(interaction.guild!.id, ocName);
    if (!oc) {
      await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" not found!`)], ephemeral: true });
      return;
    }
    ocId = oc._id.toString();
  }

  try {
    const trivia = await createTrivia({
      guildId: interaction.guild!.id,
      question,
      answer,
      category,
      ocId,
      fandom,
      createdById: interaction.user.id
    });

    await interaction.reply({
      embeds: [createSuccessEmbed(`Added trivia: "${question}"\nCategory: ${category}\nID: ${trivia._id}`)],
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
  const category = interaction.options.getString('category') as 'OC Trivia' | 'Fandom Trivia' | 'Yume Trivia' | null;

  try {
    const trivias = await getTriviaByGuild(interaction.guild!.id, category || undefined);

    if (trivias.length === 0) {
      await interaction.reply({ embeds: [createErrorEmbed('No trivia found.')], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🧠 Trivia List${category ? ` (${category})` : ''}`)
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setDescription(trivias.slice(0, 20).map((t, i) => 
        `${i + 1}. **${t.question}** (${t.category})\n   ID: \`${t._id}\``
      ).join('\n\n'));

    if (trivias.length > 20) {
      embed.setFooter({ text: `Showing 20 of ${trivias.length} trivia questions` });
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

