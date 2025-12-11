import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { createErrorEmbed, COLORS } from '../utils/embeds';
import { getAllOCs, getUniqueFandoms } from '../services/ocService';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('fandom')
    .setDescription('Fandom directory')
    .addSubcommand(subcommand =>
      subcommand
        .setName('directory')
        .setDescription('List all fandoms in the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get info about a specific fandom')
        .addStringOption(option => option.setName('fandom').setDescription('Fandom name').setRequired(true).setAutocomplete(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'directory':
        await handleDirectory(interaction);
        break;
      case 'info':
        await handleInfo(interaction);
        break;
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guild) {
      await interaction.respond([]);
      return;
    }

    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'fandom') {
      try {
        const fandoms = await getUniqueFandoms(interaction.guild.id);
        const focusedValue = focusedOption.value.toLowerCase();
        
        const choices = fandoms
          .filter(f => f.toLowerCase().includes(focusedValue))
          .slice(0, 25)
          .map(f => ({
            name: f,
            value: f
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

async function handleDirectory(interaction: ChatInputCommandInteraction) {
  try {
    const ocs = await getAllOCs(interaction.guild!.id);
    
    // Count OCs per fandom
    const fandomCounts = new Map<string, { count: number; users: Set<string> }>();
    
    for (const oc of ocs) {
      const fandom = oc.fandom;
      if (!fandomCounts.has(fandom)) {
        fandomCounts.set(fandom, { count: 0, users: new Set() });
      }
      const data = fandomCounts.get(fandom)!;
      data.count++;
      data.users.add(oc.ownerId);
    }

    if (fandomCounts.size === 0) {
      await interaction.reply({ embeds: [createErrorEmbed('No fandoms found in this server.')], ephemeral: true });
      return;
    }

    // Sort by OC count
    const sortedFandoms = Array.from(fandomCounts.entries())
      .sort((a, b) => b[1].count - a[1].count);

    const embed = new EmbedBuilder()
      .setTitle('📚 Fandom Directory')
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setDescription(sortedFandoms.map(([fandom, data]) => 
        `**${fandom}** - ${data.count} OC(s), ${data.users.size} user(s)`
      ).join('\n'));

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error getting fandom directory:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to get fandom directory.')], ephemeral: true });
  }
}

async function handleInfo(interaction: ChatInputCommandInteraction) {
  const fandomName = interaction.options.getString('fandom', true);

  try {
    const ocs = await getAllOCs(interaction.guild!.id);
    const fandomOCs = ocs.filter(oc => oc.fandom.toLowerCase() === fandomName.toLowerCase());

    if (fandomOCs.length === 0) {
      await interaction.reply({ embeds: [createErrorEmbed(`No OCs found for fandom "${fandomName}"`)], ephemeral: true });
      return;
    }

    const users = new Set(fandomOCs.map(oc => oc.ownerId));

    const embed = new EmbedBuilder()
      .setTitle(`📚 ${fandomName}`)
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .addFields(
        { name: 'OC Count', value: fandomOCs.length.toString(), inline: true },
        { name: 'User Count', value: users.size.toString(), inline: true }
      );

    const ocList = fandomOCs.slice(0, 10).map(oc => `• **${oc.name}** - <@${oc.ownerId}>`).join('\n');
    embed.addFields({ 
      name: `OCs (${fandomOCs.length > 10 ? `Showing 10 of ${fandomOCs.length}` : 'All'})`, 
      value: ocList || 'None',
      inline: false 
    });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error getting fandom info:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to get fandom info.')], ephemeral: true });
  }
}

export default command;

