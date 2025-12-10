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
  // Check if there's already an active game
  const activeGame = getActiveGame(interaction.guild!.id, interaction.channel!.id);
  if (activeGame) {
    await interaction.reply({ embeds: [createErrorEmbed('There is already an active trivia game in this channel!')], ephemeral: true });
    return;
  }

  try {
    const trivia = await getRandomTrivia(interaction.guild!.id);

    if (!trivia) {
      await interaction.reply({ embeds: [createErrorEmbed('No trivia found! Add some trivia facts first with /trivia add')], ephemeral: true });
      return;
    }

    // Get all OCs for this guild
    const allOCs = await getAllOCs(interaction.guild!.id);
    
    if (allOCs.length < 2) {
      await interaction.reply({ embeds: [createErrorEmbed('Need at least 2 OCs to play trivia!')], ephemeral: true });
      return;
    }

    // Get the correct OC (ocId might be populated or just an ObjectId)
    const ocIdString = typeof trivia.ocId === 'object' && trivia.ocId !== null 
      ? (trivia.ocId as any)._id?.toString() || trivia.ocId.toString()
      : trivia.ocId.toString();
    
    const correctOC = allOCs.find(oc => oc._id.toString() === ocIdString);
    if (!correctOC) {
      await interaction.reply({ embeds: [createErrorEmbed('The OC for this trivia no longer exists!')], ephemeral: true });
      return;
    }

    // Create multiple choice: correct OC + 3 random wrong OCs (or fewer if not enough OCs)
    const wrongOCs = allOCs.filter(oc => oc._id.toString() !== ocIdString);
    const shuffled = wrongOCs.sort(() => Math.random() - 0.5);
    const numChoices = Math.min(3, wrongOCs.length);
    const choices = [correctOC, ...shuffled.slice(0, numChoices)].sort(() => Math.random() - 0.5);

    const game = startTriviaGame(interaction.guild!.id, interaction.channel!.id, trivia, choices);

    // Create buttons for each OC choice
    const buttons = choices.map((oc, index) => 
      new ButtonBuilder()
        .setCustomId(`trivia_answer_${oc._id}`)
        .setLabel(oc.name)
        .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    const embed = new EmbedBuilder()
      .setTitle('🧠 Trivia Time!')
      .setDescription(`**Which OC does this fact belong to?**\n\n"${trivia.fact}"`)
      .setColor(COLORS.secondary)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setFooter({ text: 'Click a button to guess!' })
      .setTimestamp();

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Create button interaction collector
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000 // 5 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
      if (!buttonInteraction.guild) return;

      const game = getActiveGame(buttonInteraction.guild.id, buttonInteraction.channel!.id);
      if (!game) {
        await buttonInteraction.reply({ embeds: [createErrorEmbed('This trivia game has ended!')], ephemeral: true });
        return;
      }

      const selectedOCId = buttonInteraction.customId.replace('trivia_answer_', '');
      
      if (!submitAnswer(buttonInteraction.guild.id, buttonInteraction.channel!.id, buttonInteraction.user.id, selectedOCId)) {
        await buttonInteraction.reply({ embeds: [createErrorEmbed('You have already answered!')], ephemeral: true });
        return;
      }

      const isCorrect = checkAnswer(game, selectedOCId);
      const selectedOC = game.choices.find(oc => oc._id.toString() === selectedOCId);

      if (isCorrect) {
        const timeTaken = (new Date().getTime() - game.startTime.getTime()) / 1000;
        const embed = new EmbedBuilder()
          .setTitle('🎉 Correct!')
          .setDescription(`**${buttonInteraction.user.tag}** got it right!\n\nThe fact belongs to: **${selectedOC?.name}**\nTime: ${timeTaken.toFixed(1)}s`)
          .setColor(COLORS.success)
          .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');

        await buttonInteraction.reply({ embeds: [embed] });
        endTriviaGame(buttonInteraction.guild.id, buttonInteraction.channel!.id);
        collector.stop();
      } else {
        await buttonInteraction.reply({ 
          embeds: [createErrorEmbed(`Wrong! You selected **${selectedOC?.name}**. Try again!`)], 
          ephemeral: true 
        });
      }
    });

    collector.on('end', async () => {
      const currentGame = getActiveGame(interaction.guild!.id, interaction.channel!.id);
      if (currentGame && currentGame.trivia._id.toString() === trivia._id.toString()) {
        endTriviaGame(interaction.guild!.id, interaction.channel!.id);
        const correctOC = currentGame.choices.find(oc => oc._id.toString() === currentGame.correctOCId);
        const endEmbed = new EmbedBuilder()
          .setTitle('⏰ Trivia Time\'s Up!')
          .setDescription(`The fact belongs to: **${correctOC?.name || 'Unknown'}**`)
          .setColor(COLORS.warning)
          .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');
        await interaction.channel!.send({ embeds: [endEmbed] });
      }
    });
  } catch (error) {
    console.error('Error starting trivia:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to start trivia.')], ephemeral: true });
  }
}

export default command;

