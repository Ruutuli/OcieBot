import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import { getAllOCs, getUniqueFandoms } from '../services/ocService';
import { getAllFandoms } from '../services/fandomService';
import { Fandom } from '../database/models/Fandom';
import { hasManageServer } from '../utils/permissions';

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
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('color')
        .setDescription('Set a color for a fandom (admin only)')
        .addStringOption(option => option.setName('fandom').setDescription('Fandom name').setRequired(true).setAutocomplete(true))
        .addStringOption(option => option.setName('color').setDescription('Hex color code (e.g., #FF5733)').setRequired(true))
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
      case 'color':
        await handleColor(interaction);
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
        const hardcodedFandoms = getAllFandoms();
        const existingFandoms = await getUniqueFandoms(interaction.guild.id);
        const allFandoms = Array.from(new Set([...hardcodedFandoms, ...existingFandoms]));
        const focusedValue = focusedOption.value.toLowerCase();
        
        const choices = allFandoms
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
    
    // Count OCs per fandom (OCs can have multiple fandoms)
    const fandomCounts = new Map<string, { count: number; users: Set<string> }>();
    
    for (const oc of ocs) {
      const fandoms = oc.fandoms || [];
      for (const fandom of fandoms) {
        if (fandom && fandom.trim()) {
          if (!fandomCounts.has(fandom)) {
            fandomCounts.set(fandom, { count: 0, users: new Set() });
          }
          const data = fandomCounts.get(fandom)!;
          data.count++;
          data.users.add(oc.ownerId);
        }
      }
    }

    if (fandomCounts.size === 0) {
      await interaction.reply({ embeds: [createErrorEmbed('No fandoms found in this server.')], ephemeral: true });
      return;
    }

    // Fetch stored fandom metadata (colors)
    const storedFandoms = await Fandom.find({ guildId: interaction.guild!.id });
    const fandomMetadata = new Map<string, { color?: string }>();
    storedFandoms.forEach((fandom) => {
      fandomMetadata.set(fandom.name, { color: fandom.color });
    });

    // Sort by OC count
    const sortedFandoms = Array.from(fandomCounts.entries())
      .sort((a, b) => b[1].count - a[1].count);

    const embed = new EmbedBuilder()
      .setTitle('📚 Fandom Directory')
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
      .setDescription(sortedFandoms.map(([fandom, data]) => {
        const metadata = fandomMetadata.get(fandom);
        const colorIndicator = metadata?.color ? ` ${metadata.color}` : '';
        return `**${fandom}**${colorIndicator} - ${data.count} OC(s), ${data.users.size} user(s)`;
      }).join('\n'));

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
    const fandomOCs = ocs.filter(oc => {
      const fandoms = oc.fandoms || [];
      return fandoms.some(f => f.toLowerCase() === fandomName.toLowerCase());
    });

    if (fandomOCs.length === 0) {
      await interaction.reply({ embeds: [createErrorEmbed(`No OCs found for fandom "${fandomName}"`)], ephemeral: true });
      return;
    }

    const users = new Set(fandomOCs.map(oc => oc.ownerId));

    // Get fandom metadata (color)
    const storedFandom = await Fandom.findOne({ name: fandomName, guildId: interaction.guild!.id });
    const fandomColor = storedFandom?.color;

    // Convert hex color to number if available
    let embedColor = COLORS.info;
    if (fandomColor && /^#[0-9A-F]{6}$/i.test(fandomColor)) {
      embedColor = parseInt(fandomColor.substring(1), 16);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📚 ${fandomName}`)
      .setColor(embedColor)
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

async function handleColor(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
    return;
  }

  // Check if user has manage server permission
  if (!hasManageServer(interaction.member)) {
    await interaction.reply({ embeds: [createErrorEmbed('You need the "Manage Server" permission to use this command.')], ephemeral: true });
    return;
  }

  const fandomName = interaction.options.getString('fandom', true);
  const color = interaction.options.getString('color', true);

  // Validate color format
  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    await interaction.reply({ embeds: [createErrorEmbed('Invalid color format. Please use a hex color code like #FF5733')], ephemeral: true });
    return;
  }

  try {
    // Verify fandom exists (has at least one OC)
    const ocs = await getAllOCs(interaction.guild.id);
    const fandomExists = ocs.some(oc => {
      const fandoms = oc.fandoms || [];
      return fandoms.some(f => f.toLowerCase() === fandomName.toLowerCase());
    });

    if (!fandomExists) {
      await interaction.reply({ embeds: [createErrorEmbed(`Fandom "${fandomName}" not found. Make sure there's at least one OC with this fandom.`)], ephemeral: true });
      return;
    }

    // Find or create the fandom record
    const fandom = await Fandom.findOneAndUpdate(
      { name: fandomName, guildId: interaction.guild.id },
      { 
        name: fandomName,
        guildId: interaction.guild.id,
        color: color
      },
      { upsert: true, new: true }
    );

    await interaction.reply({ 
      embeds: [createSuccessEmbed(`Color for fandom "${fandomName}" has been set to ${color}`)], 
      ephemeral: true 
    });
  } catch (error) {
    console.error('Error setting fandom color:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to set fandom color.')], ephemeral: true });
  }
}

export default command;

