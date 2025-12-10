import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { hasManageServer } from '../utils/permissions';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { createTrivia, getTriviaByGuild, deleteTrivia, getTriviaById, updateTrivia } from '../services/triviaService';
import { startTriviaGame, getActiveGameByUserId, endTriviaGame, submitAnswer, setCurrentQuestion, getScoreboard } from '../services/triviaGame';
import { getOCByName, getOCsByOwner } from '../services/ocService';
import mongoose from 'mongoose';

// Helper function to format trivia ID (T + first 4 chars of ObjectId)
function formatTriviaId(id: string): string {
  return `T${id.substring(0, 4).toUpperCase()}`;
}

// Helper function to parse trivia ID (remove T prefix and find matching trivia)
async function findTriviaById(guildId: string, formattedId: string): Promise<{ trivia: any; fullId: string } | null> {
  // Remove T prefix and convert to uppercase
  const idSuffix = formattedId.replace(/^T/i, '').toUpperCase();
  
  // Get all trivia for this guild
  const allTrivia = await getTriviaByGuild(guildId);
  
  // Find trivia that starts with the ID suffix
  for (const trivia of allTrivia) {
    const triviaId = trivia._id.toString().toUpperCase();
    if (triviaId.startsWith(idSuffix)) {
      return { trivia, fullId: trivia._id.toString() };
    }
  }
  
  return null;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Manage OC trivia questions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a trivia question about an OC')
        .addStringOption(option => option.setName('question').setDescription('The trivia question').setRequired(true))
        .addStringOption(option => option.setName('oc_name').setDescription('The OC this question is about (the answer)').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Start a trivia game - answer as many questions as you can!')
        .addIntegerOption(option => option.setName('wrong_limit').setDescription('Number of wrong answers before game ends (default: 3)').setMinValue(1).setMaxValue(10))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('answer')
        .setDescription('Answer the current trivia question')
        .addStringOption(option => option.setName('oc').setDescription('OC name (your answer)').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all trivia questions with their IDs')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit a trivia question you created')
        .addStringOption(option => option.setName('id').setDescription('Trivia ID (e.g., T1234)').setRequired(true))
        .addStringOption(option => option.setName('question').setDescription('New question text').setRequired(true))
        .addStringOption(option => option.setName('oc_name').setDescription('New OC name (the answer)').setRequired(false).setAutocomplete(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a trivia question')
        .addStringOption(option => option.setName('id').setDescription('Trivia ID (e.g., T1234)').setRequired(true))
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
      case 'play':
        await handlePlay(interaction);
        break;
      case 'answer':
        await handleAnswer(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      case 'edit':
        await handleEdit(interaction);
        break;
      case 'remove':
        await handleRemove(interaction);
        break;
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'oc_name' || focusedOption.name === 'oc') {
      if (!interaction.guild) {
        await interaction.respond([]);
        return;
      }

      try {
        const userOCs = await getOCsByOwner(interaction.guild.id, interaction.user.id);
        const focusedValue = focusedOption.value.toLowerCase();
        
        const choices = userOCs
          .filter(oc => oc.name.toLowerCase().includes(focusedValue))
          .slice(0, 25)
          .map(oc => ({
            name: oc.name,
            value: oc.name
          }));

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
  const ocName = interaction.options.getString('oc_name', true);

  const oc = await getOCByName(interaction.guild!.id, ocName);
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" not found!`)], ephemeral: true });
    return;
  }

  try {
    const trivia = await createTrivia({
      guildId: interaction.guild!.id,
      question,
      ocId: oc._id.toString(),
      createdById: interaction.user.id
    });

    const triviaId = formatTriviaId(trivia._id.toString());
    await interaction.reply({
      embeds: [createSuccessEmbed(`Added trivia question:\n"${question}"\n\nAnswer: **${oc.name}**\nTrivia ID: \`${triviaId}\``)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error adding trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to add trivia.')], ephemeral: true });
  }
}

async function handlePlay(interaction: ChatInputCommandInteraction) {
  const wrongLimit = interaction.options.getInteger('wrong_limit') || 3;

  // Check if user already has an active game
  const existingGame = getActiveGameByUserId(interaction.user.id);
  if (existingGame) {
    await interaction.reply({ 
      embeds: [createErrorEmbed('You already have an active trivia game! Use /trivia answer to continue playing.')], 
      ephemeral: true 
    });
    return;
  }

  try {
    // Start the game
    const game = startTriviaGame(interaction.user.id, interaction.guild!.id, interaction.channel!.id, wrongLimit);

    // Get first question
    await askNextQuestion(interaction, game);

    const embed = new EmbedBuilder()
      .setTitle('🎮 Trivia Game Started!')
      .setDescription(`Answer as many questions as you can!\n\n**Wrong Answer Limit:** ${wrongLimit}\n\nUse \`/trivia answer oc:<oc_name>\` to answer each question.`)
      .setColor(COLORS.success)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setFooter({ text: 'Good luck!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error starting trivia game:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to start trivia game.')], ephemeral: true });
  }
}

async function askNextQuestion(interaction: ChatInputCommandInteraction, game: any) {
  try {
    // Get all trivia for this guild
    const allTrivia = await getTriviaByGuild(interaction.guild!.id);
    
    // Filter out already asked questions
    const availableTrivia = allTrivia.filter(t => !game.answeredTriviaIds.has(t._id.toString()));
    
    if (availableTrivia.length === 0) {
      // No more questions available
      endTriviaGame(game.userId);
      const finalEmbed = new EmbedBuilder()
        .setTitle('🏁 Game Over!')
        .setDescription(`**Final Score:**\n✅ ${game.correctCount} correct\n❌ ${game.wrongCount} wrong\n📝 ${game.questionsAsked} questions answered`)
        .setColor(COLORS.info)
        .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');
      if (interaction.channel && 'send' in interaction.channel) {
        await interaction.channel.send({ embeds: [finalEmbed] });
      }
      return;
    }

    // Pick a random question
    const randomTrivia = availableTrivia[Math.floor(Math.random() * availableTrivia.length)];
    setCurrentQuestion(game, randomTrivia);

    const triviaId = formatTriviaId(randomTrivia._id.toString());
    const embed = new EmbedBuilder()
      .setTitle('🧠 Trivia Question')
      .setDescription(`**${randomTrivia.question}**`)
      .setColor(COLORS.secondary)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .addFields(
        { name: 'Trivia ID', value: `\`${triviaId}\``, inline: true },
        { name: 'Score', value: getScoreboard(game), inline: false }
      )
      .setFooter({ text: `Use /trivia answer oc:<oc_name> to answer!` })
      .setTimestamp();

    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error asking next question:', error);
  }
}

async function handleAnswer(interaction: ChatInputCommandInteraction) {
  const ocName = interaction.options.getString('oc', true);

  try {
    const game = getActiveGameByUserId(interaction.user.id);
    
    if (!game) {
      await interaction.reply({ embeds: [createErrorEmbed('You don\'t have an active trivia game! Use /trivia play to start one.')], ephemeral: true });
      return;
    }

    if (!game.currentTrivia) {
      await interaction.reply({ embeds: [createErrorEmbed('No question is currently active!')], ephemeral: true });
      return;
    }

    const result = submitAnswer(interaction.user.id, ocName);
    
    if (!result.correct && game.lastAnswerTime === null) {
      // Already answered this question
      await interaction.reply({ embeds: [createErrorEmbed('You have already answered this question!')], ephemeral: true });
      return;
    }

    if (result.correct) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Correct!')
        .setDescription(`**${interaction.user.tag}** got it right!\n\nAnswer: **${game.correctOCName}**`)
        .setColor(COLORS.success)
        .addFields({ name: 'Score', value: getScoreboard(game), inline: false })
        .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');

      await interaction.reply({ embeds: [embed] });

      // Ask next question
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await askNextQuestion(interaction, game);
    } else {
      // Wrong answer
      if (result.gameOver) {
        // Game over
        endTriviaGame(interaction.user.id);
        const finalEmbed = new EmbedBuilder()
          .setTitle('💀 Game Over!')
          .setDescription(`**${interaction.user.tag}** reached the wrong answer limit!\n\n**Final Score:**\n✅ ${game.correctCount} correct\n❌ ${game.wrongCount} wrong\n📝 ${game.questionsAsked} questions answered`)
          .setColor(COLORS.error)
          .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');
        await interaction.reply({ embeds: [finalEmbed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ Incorrect!')
          .setDescription(`"${ocName}" is not the right answer.\n\n**Wrong answers:** ${game.wrongCount}/${game.wrongLimit}`)
          .setColor(COLORS.error)
          .addFields({ name: 'Score', value: getScoreboard(game), inline: false })
          .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');

        await interaction.reply({ embeds: [embed] });

        // Ask next question
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await askNextQuestion(interaction, game);
      }
    }
  } catch (error) {
    console.error('Error answering trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to answer trivia.')], ephemeral: true });
  }
}

async function handleEdit(interaction: ChatInputCommandInteraction) {
  const formattedId = interaction.options.getString('id', true);
  const newQuestion = interaction.options.getString('question', true);
  const newOCName = interaction.options.getString('oc_name', false);
  const member = await interaction.guild!.members.fetch(interaction.user.id);

  try {
    const result = await findTriviaById(interaction.guild!.id, formattedId);
    if (!result) {
      await interaction.reply({ embeds: [createErrorEmbed(`Trivia with ID "${formattedId}" not found!`)], ephemeral: true });
      return;
    }

    const { trivia, fullId } = result;

    if (trivia.guildId !== interaction.guild!.id) {
      await interaction.reply({ embeds: [createErrorEmbed('Trivia not found in this server!')], ephemeral: true });
      return;
    }

    if (trivia.createdById !== interaction.user.id && !hasManageServer(member)) {
      await interaction.reply({ embeds: [createErrorEmbed('You can only edit your own trivia!')], ephemeral: true });
      return;
    }

    const updateData: { question: string; ocId?: string } = { question: newQuestion };

    if (newOCName) {
      const oc = await getOCByName(interaction.guild!.id, newOCName);
      if (!oc) {
        await interaction.reply({ embeds: [createErrorEmbed(`OC "${newOCName}" not found!`)], ephemeral: true });
        return;
      }
      updateData.ocId = oc._id.toString();
    }

    const updatedTrivia = await updateTrivia(fullId, updateData);
    if (!updatedTrivia) {
      await interaction.reply({ embeds: [createErrorEmbed('Failed to update trivia.')], ephemeral: true });
      return;
    }

    const oc = (updatedTrivia.ocId as any)?.name || 'Unknown OC';
    await interaction.reply({
      embeds: [createSuccessEmbed(`Trivia ${formattedId} updated!\n\n**Question:** ${updatedTrivia.question}\n**Answer:** ${oc}`)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error editing trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to edit trivia.')], ephemeral: true });
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const formattedId = interaction.options.getString('id', true);
  const member = await interaction.guild!.members.fetch(interaction.user.id);

  try {
    const result = await findTriviaById(interaction.guild!.id, formattedId);
    if (!result) {
      await interaction.reply({ embeds: [createErrorEmbed(`Trivia with ID "${formattedId}" not found!`)], ephemeral: true });
      return;
    }

    const { trivia, fullId } = result;

    if (trivia.guildId !== interaction.guild!.id) {
      await interaction.reply({ embeds: [createErrorEmbed('Trivia not found in this server!')], ephemeral: true });
      return;
    }

    if (trivia.createdById !== interaction.user.id && !hasManageServer(member)) {
      await interaction.reply({ embeds: [createErrorEmbed('You can only remove your own trivia!')], ephemeral: true });
      return;
    }

    await deleteTrivia(fullId);
    await interaction.reply({ embeds: [createSuccessEmbed(`Trivia ${formattedId} removed!`)], ephemeral: true });
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
      .setTitle('🧠 Trivia Questions List')
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setDescription(trivias.slice(0, 20).map((t, i) => {
        const oc = (t.ocId as any)?.name || 'Unknown OC';
        const triviaId = formatTriviaId(t._id.toString());
        return `${i + 1}. **${t.question}**\n   Answer: ${oc} | ID: \`${triviaId}\``;
      }).join('\n\n'));

    if (trivias.length > 20) {
      embed.setFooter({ text: `Showing 20 of ${trivias.length} trivia questions` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error listing trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to list trivia.')], ephemeral: true });
  }
}

export default command;

