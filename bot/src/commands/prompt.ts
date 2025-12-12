import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, EmbedBuilder, TextChannel } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { createPrompt, getPromptsByGuild, getRandomPrompt, deletePrompt, getPromptById, updatePrompt } from '../services/promptService';
import { getServerConfig } from '../services/configService';
import { createPromptAnswer, getPromptAnswers } from '../services/promptAnswerService';
import { getAllOCs, getOCByName } from '../services/ocService';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('prompt')
    .setDescription('Manage RP prompts')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new prompt')
        .addStringOption(option => option.setName('text').setDescription('The prompt text').setRequired(true))
        .addStringOption(option => option.setName('category').setDescription('Category')
          .addChoices(
            { name: 'General', value: 'General' },
            { name: 'RP', value: 'RP' },
            { name: 'Worldbuilding', value: 'Worldbuilding' },
            { name: 'Misc', value: 'Misc' }
          ))
        .addStringOption(option => option.setName('fandom').setDescription('Fandom (optional)'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a prompt')
        .addStringOption(option => option.setName('id').setDescription('Prompt ID').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all prompts')
        .addStringOption(option => option.setName('category').setDescription('Filter by category')
          .addChoices(
            { name: 'General', value: 'General' },
            { name: 'RP', value: 'RP' },
            { name: 'Worldbuilding', value: 'Worldbuilding' },
            { name: 'Misc', value: 'Misc' }
          ))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('random')
        .setDescription('Get a random prompt')
        .addStringOption(option => option.setName('category').setDescription('Filter by category')
          .addChoices(
            { name: 'General', value: 'General' },
            { name: 'RP', value: 'RP' },
            { name: 'Worldbuilding', value: 'Worldbuilding' },
            { name: 'Misc', value: 'Misc' }
          ))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit a prompt you created')
        .addStringOption(option => option.setName('id').setDescription('Prompt ID').setRequired(true).setAutocomplete(true))
        .addStringOption(option => option.setName('text').setDescription('The new prompt text').setRequired(true))
        .addStringOption(option => option.setName('category').setDescription('Category')
          .addChoices(
            { name: 'General', value: 'General' },
            { name: 'RP', value: 'RP' },
            { name: 'Worldbuilding', value: 'Worldbuilding' },
            { name: 'Misc', value: 'Misc' }
          ))
        .addStringOption(option => option.setName('fandom').setDescription('Fandom (optional, leave empty to clear)'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('use')
        .setDescription('Post a prompt to the configured channel')
        .addStringOption(option => option.setName('id').setDescription('Prompt ID').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('answer')
        .setDescription('Answer a prompt')
        .addStringOption(option => option.setName('prompt_id').setDescription('Prompt ID').setRequired(true).setAutocomplete(true))
        .addStringOption(option => option.setName('response').setDescription('Your response').setRequired(true))
        .addStringOption(option => option.setName('oc_name').setDescription('OC name (optional - answer as this OC)').setAutocomplete(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('responses')
        .setDescription('View responses to prompts')
        .addStringOption(option => option.setName('prompt_id').setDescription('Prompt ID (optional)').setAutocomplete(true))
        .addUserOption(option => option.setName('user').setDescription('Filter by user (optional)'))
        .addStringOption(option => option.setName('oc_name').setDescription('Filter by OC (optional)').setAutocomplete(true))
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
      case 'edit':
        await handleEdit(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      case 'random':
        await handleRandom(interaction);
        break;
      case 'use':
        await handleUse(interaction);
        break;
      case 'answer':
        await handleAnswer(interaction);
        break;
      case 'responses':
        await handleResponses(interaction);
        break;
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guild) {
      await interaction.respond([]);
      return;
    }

    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'id' || focusedOption.name === 'prompt_id') {
      try {
        const prompts = await getPromptsByGuild(interaction.guild.id);
        const focusedValue = focusedOption.value.toLowerCase();
        
        const choices = prompts
          .filter(p => {
            const idStr = (p.id || p._id.toString()).toLowerCase();
            const textStr = p.text.toLowerCase();
            return idStr.includes(focusedValue) || textStr.includes(focusedValue);
          })
          .slice(0, 25)
          .map(p => {
            const textPreview = p.text.length > 80 ? p.text.substring(0, 77) + '...' : p.text;
            const displayId = p.id || p._id.toString().substring(0, 8);
            return {
              name: `${displayId} - ${textPreview}`,
              value: p.id || p._id.toString()
            };
          });

        await interaction.respond(choices);
      } catch (error) {
        console.error('Error in autocomplete:', error);
        await interaction.respond([]);
      }
    } else if (focusedOption.name === 'oc_name') {
      try {
        const userOCs = await getAllOCs(interaction.guild.id);
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
  const text = interaction.options.getString('text', true);
  const category = (interaction.options.getString('category') || 'General') as 'General' | 'RP' | 'Worldbuilding' | 'Misc';
  const fandom = interaction.options.getString('fandom');

  // Basic validation - ensure prompt is OC-neutral (doesn't assume character actions)
  // This is a simple check - more complex validation could be added
  const actionWords = ['your OC', 'your character', 'they', 'he', 'she', 'it does', 'it feels'];
  const hasAssumedActions = actionWords.some(word => text.toLowerCase().includes(word.toLowerCase()));
  
  if (hasAssumedActions) {
    await interaction.reply({
      embeds: [createErrorEmbed('Prompts should be scenario-based and not assume character actions. Please rewrite to be OC-neutral.')],
      ephemeral: true
    });
    return;
  }

  try {
    const promptData: any = {
      guildId: interaction.guild!.id,
      text,
      category,
      createdById: interaction.user.id
    };
    if (fandom && fandom.trim() !== '') {
      promptData.fandom = fandom.trim();
    }
    const prompt = await createPrompt(promptData);

    let responseText = `Added prompt: "${text}"\nCategory: ${category}`;
    if (prompt.fandom) {
      responseText += `\nFandom: ${prompt.fandom}`;
    }
    responseText += `\nID: ${prompt.id || prompt._id}`;

    await interaction.reply({
      embeds: [createSuccessEmbed(responseText)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error adding prompt:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to add prompt.')], ephemeral: true });
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);

  const prompt = await getPromptById(id);
  if (!prompt) {
    await interaction.reply({ embeds: [createErrorEmbed('Prompt not found!')], ephemeral: true });
    return;
  }

  if (prompt.guildId !== interaction.guild!.id) {
    await interaction.reply({ embeds: [createErrorEmbed('Prompt not found in this server!')], ephemeral: true });
    return;
  }

  if (prompt.createdById !== interaction.user.id) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only remove your own prompts!')], ephemeral: true });
    return;
  }

  try {
    await deletePrompt(id);
    await interaction.reply({ embeds: [createSuccessEmbed('Prompt removed!')], ephemeral: true });
  } catch (error) {
    console.error('Error removing prompt:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to remove prompt.')], ephemeral: true });
  }
}

async function handleEdit(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  const text = interaction.options.getString('text', true);
  const category = interaction.options.getString('category') as 'General' | 'RP' | 'Worldbuilding' | 'Misc' | null;

  const prompt = await getPromptById(id);
  if (!prompt) {
    await interaction.reply({ embeds: [createErrorEmbed('Prompt not found!')], ephemeral: true });
    return;
  }

  if (prompt.guildId !== interaction.guild!.id) {
    await interaction.reply({ embeds: [createErrorEmbed('Prompt not found in this server!')], ephemeral: true });
    return;
  }

  if (prompt.createdById !== interaction.user.id) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only edit your own prompts!')], ephemeral: true });
    return;
  }

  // Basic validation - ensure prompt is OC-neutral
  const actionWords = ['your OC', 'your character', 'they', 'he', 'she', 'it does', 'it feels'];
  const hasAssumedActions = actionWords.some(word => text.toLowerCase().includes(word.toLowerCase()));
  
  if (hasAssumedActions) {
    await interaction.reply({
      embeds: [createErrorEmbed('Prompts should be scenario-based and not assume character actions. Please rewrite to be OC-neutral.')],
      ephemeral: true
    });
    return;
  }

  try {
    const updateData: any = { text };
    if (category) {
      updateData.category = category;
    }
    const fandom = interaction.options.getString('fandom');
    if (fandom !== null) {
      updateData.fandom = fandom && fandom.trim() !== '' ? fandom.trim() : null;
    }
    const updatedPrompt = await updatePrompt(id, updateData);

    let responseText = `Updated prompt: "${updatedPrompt.text}"\nCategory: ${updatedPrompt.category}`;
    if (updatedPrompt.fandom) {
      responseText += `\nFandom: ${updatedPrompt.fandom}`;
    }
    responseText += `\nID: ${updatedPrompt.id || updatedPrompt._id}`;

    await interaction.reply({
      embeds: [createSuccessEmbed(responseText)],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to update prompt.')], ephemeral: true });
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getString('category') as 'General' | 'RP' | 'Worldbuilding' | 'Misc' | null;

  try {
    const prompts = await getPromptsByGuild(interaction.guild!.id, category || undefined);

    if (prompts.length === 0) {
      await interaction.reply({ embeds: [createErrorEmbed('No prompts found.')], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎭 Prompt List${category ? ` (${category})` : ''}`)
      .setColor(COLORS.secondary)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setDescription(prompts.slice(0, 20).map((p, i) => 
        `${i + 1}. **${p.text}** (${p.category}${p.fandom ? ` • ${p.fandom}` : ''})\n   ID: \`${p.id || p._id}\``
      ).join('\n\n'));

    if (prompts.length > 20) {
      embed.setFooter({ text: `Showing 20 of ${prompts.length} prompts` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error listing prompts:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to list prompts.')], ephemeral: true });
  }
}

async function handleRandom(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getString('category') as 'General' | 'RP' | 'Worldbuilding' | 'Misc' | null;

  try {
    const prompt = await getRandomPrompt(interaction.guild!.id, category || undefined);

    if (!prompt) {
      await interaction.reply({ embeds: [createErrorEmbed('No prompts found!')], ephemeral: true });
      return;
    }

    // Get fandom color if available
    const { Fandom } = await import('../database/models/Fandom');
    let fandomColor: string | undefined;
    if (prompt.fandom) {
      const storedFandom = await Fandom.findOne({ name: prompt.fandom, guildId: interaction.guild!.id });
      fandomColor = storedFandom?.color;
    }

    const embedColor = fandomColor && /^#[0-9A-F]{6}$/i.test(fandomColor)
      ? parseInt(fandomColor.substring(1), 16)
      : COLORS.secondary;

    const embed = new EmbedBuilder()
      .setTitle('🎭 Random Prompt')
      .setDescription(prompt.text)
      .setColor(embedColor)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .addFields({ name: 'Category', value: prompt.category, inline: false });
    
    if (prompt.fandom) {
      embed.addFields({ name: 'Fandom', value: prompt.fandom, inline: false });
    }
    
    // Add creator info
    const creator = await interaction.guild!.members.fetch(prompt.createdById).catch(() => null);
    embed.setFooter({ text: `Submitted by ${creator?.user.tag || 'Unknown'}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error getting random prompt:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to get prompt.')], ephemeral: true });
  }
}

async function handleUse(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  const config = await getServerConfig(interaction.guild!.id);

  if (!config || !config.channels.prompts) {
    await interaction.reply({ embeds: [createErrorEmbed('Prompt channel not configured. Use /ocie set to configure it.')], ephemeral: true });
    return;
  }

  const prompt = await getPromptById(id);
  if (!prompt || prompt.guildId !== interaction.guild!.id) {
    await interaction.reply({ embeds: [createErrorEmbed('Prompt not found!')], ephemeral: true });
    return;
  }

  try {
    const channel = await interaction.guild!.channels.fetch(config.channels.prompts) as TextChannel;
    if (!channel) {
      await interaction.reply({ embeds: [createErrorEmbed('Prompt channel not found!')], ephemeral: true });
      return;
    }

    // Get fandom color if available
    const { Fandom } = await import('../database/models/Fandom');
    let fandomColor: string | undefined;
    if (prompt.fandom) {
      const storedFandom = await Fandom.findOne({ name: prompt.fandom, guildId: interaction.guild!.id });
      fandomColor = storedFandom?.color;
    }

    const embedColor = fandomColor && /^#[0-9A-F]{6}$/i.test(fandomColor)
      ? parseInt(fandomColor.substring(1), 16)
      : COLORS.secondary;

    const embed = new EmbedBuilder()
      .setTitle('🎭 RP Prompt')
      .setDescription(prompt.text)
      .setColor(embedColor)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .addFields({ name: 'Category', value: prompt.category, inline: false });
    
    if (prompt.fandom) {
      embed.addFields({ name: 'Fandom', value: prompt.fandom, inline: false });
    }
    
    // Add creator info (show original creator, not the poster)
    const creator = await interaction.guild!.members.fetch(prompt.createdById).catch(() => null);
    embed.setFooter({ text: `Submitted by ${creator?.user.tag || 'Unknown'} • Posted by ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ embeds: [createSuccessEmbed('Prompt posted!')], ephemeral: true });
  } catch (error) {
    console.error('Error using prompt:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to post prompt.')], ephemeral: true });
  }
}

async function handleAnswer(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
    return;
  }

  const promptId = interaction.options.getString('prompt_id', true);
  const response = interaction.options.getString('response', true);
  const ocName = interaction.options.getString('oc_name');

  try {
    // Verify Prompt exists
    const prompt = await getPromptById(promptId);
    if (!prompt || prompt.guildId !== interaction.guild.id) {
      await interaction.reply({ embeds: [createErrorEmbed('Prompt not found!')], ephemeral: true });
      return;
    }

    // Find OC if provided
    let ocId: string | undefined;
    if (ocName) {
      const oc = await getOCByName(interaction.guild.id, ocName);
      if (!oc) {
        await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" not found!`)], ephemeral: true });
        return;
      }
      // Verify OC belongs to user
      if (oc.ownerId !== interaction.user.id) {
        await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" doesn't belong to you!`)], ephemeral: true });
        return;
      }
      ocId = oc._id.toString();
    }

    const answer = await createPromptAnswer({
      promptId: prompt.id || prompt._id.toString(),
      userId: interaction.user.id,
      ocId,
      response,
      guildId: interaction.guild.id
    });

    let responseText = `Response saved!`;
    if (ocName) {
      responseText += `\nResponded as **${ocName}**`;
    }
    responseText += `\nPrompt ID: ${prompt.id || prompt._id.toString()}`;

    await interaction.reply({ 
      embeds: [createSuccessEmbed(responseText)], 
      ephemeral: true 
    });
  } catch (error: any) {
    console.error('Error answering prompt:', error);
    await interaction.reply({ 
      embeds: [createErrorEmbed(error.message || 'Failed to save response.')], 
      ephemeral: true 
    });
  }
}

async function handleResponses(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
    return;
  }

  const promptId = interaction.options.getString('prompt_id');
  const user = interaction.options.getUser('user');
  const ocName = interaction.options.getString('oc_name');

  try {
    let ocId: string | undefined;
    if (ocName) {
      const oc = await getOCByName(interaction.guild.id, ocName);
      if (oc) {
        ocId = oc._id.toString();
      }
    }

    const answers = await getPromptAnswers(
      interaction.guild.id,
      promptId || undefined,
      user?.id,
      ocId
    );

    if (answers.length === 0) {
      await interaction.reply({ 
        embeds: [createErrorEmbed('No responses found matching your criteria.')], 
        ephemeral: true 
      });
      return;
    }

    // Build embed with answers
    const embed = new EmbedBuilder()
      .setTitle('📝 Prompt Responses')
      .setColor(COLORS.secondary);

    let description = '';
    for (let i = 0; i < Math.min(answers.length, 10); i++) {
      const answer = answers[i] as any;
      const prompt = answer.promptId;
      const oc = answer.ocId;
      const promptPreview = prompt?.text ? (prompt.text.length > 60 ? prompt.text.substring(0, 57) + '...' : prompt.text) : 'Unknown Prompt';
      const ocText = oc ? ` as **${oc.name}**` : '';
      description += `**Prompt:** ${promptPreview}${ocText}\n**Response:** ${answer.response}\n\n`;
    }

    if (answers.length > 10) {
      description += `\n*Showing 10 of ${answers.length} responses*`;
    }

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error: any) {
    console.error('Error fetching prompt responses:', error);
    await interaction.reply({ 
      embeds: [createErrorEmbed('Failed to fetch responses.')], 
      ephemeral: true 
    });
  }
}

export default command;

