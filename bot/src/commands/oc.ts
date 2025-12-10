import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { canManageOC } from '../utils/permissions';
import { createErrorEmbed, createSuccessEmbed, COLORS } from '../utils/embeds';
import {
  createOC,
  getOCByName,
  getOCsByOwner,
  getOCsByFandom,
  searchOCs,
  getRandomOC,
  getAllOCs,
  updateOC,
  deleteOC,
  addPlaylistSong,
  removePlaylistSong,
  addNote
} from '../services/ocService';
import { formatOCCard, formatOCList } from '../utils/ocFormatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('oc')
    .setDescription('Manage your OCs')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new OC')
        .addStringOption(option => option.setName('name').setDescription('OC name').setRequired(true))
        .addStringOption(option => option.setName('fandom').setDescription('Fandom').setRequired(true))
        .addStringOption(option => option.setName('age').setDescription('Age'))
        .addStringOption(option => option.setName('race').setDescription('Race/Species'))
        .addStringOption(option => option.setName('gender').setDescription('Gender'))
        .addStringOption(option => option.setName('birthday').setDescription('Birthday (MM-DD)'))
        .addStringOption(option => option.setName('biolink').setDescription('Bio link (Toyhou.se, Carrd, etc.)'))
        .addStringOption(option => option.setName('image_url').setDescription('Image URL (must be externally hosted)'))
        .addStringOption(option => option.setName('fo_name').setDescription('F/O name (yume)'))
        .addStringOption(option => option.setName('fo_source').setDescription('F/O source/fandom (yume)'))
        .addStringOption(option => option.setName('relationship_type').setDescription('Relationship type (yume)'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit an existing OC')
        .addStringOption(option => option.setName('name').setDescription('OC name').setRequired(true))
        .addStringOption(option => option.setName('field').setDescription('Field to edit').setRequired(true)
          .addChoices(
            { name: 'Name', value: 'name' },
            { name: 'Fandom', value: 'fandom' },
            { name: 'Age', value: 'age' },
            { name: 'Race', value: 'race' },
            { name: 'Gender', value: 'gender' },
            { name: 'Birthday', value: 'birthday' },
            { name: 'Bio Link', value: 'bioLink' },
            { name: 'Image URL', value: 'imageUrl' }
          ))
        .addStringOption(option => option.setName('value').setDescription('New value').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete an OC')
        .addStringOption(option => option.setName('name').setDescription('OC name').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View an OC card')
        .addStringOption(option => option.setName('name').setDescription('OC name').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List OCs')
        .addStringOption(option => option.setName('filter').setDescription('Filter by')
          .addChoices(
            { name: 'Owner', value: 'owner' },
            { name: 'Fandom', value: 'fandom' },
            { name: 'Search', value: 'search' }
          ))
        .addStringOption(option => option.setName('value').setDescription('Filter value'))
        .addUserOption(option => option.setName('user').setDescription('User (for owner filter)'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('random')
        .setDescription('Get a random OC')
    )
    .addSubcommandGroup(group =>
      group
        .setName('playlist')
        .setDescription('Manage OC playlists')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a song to OC playlist')
            .addStringOption(option => option.setName('oc_name').setDescription('OC name').setRequired(true))
            .addStringOption(option => option.setName('song_link').setDescription('Song link').setRequired(true))
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a song from OC playlist')
            .addStringOption(option => option.setName('oc_name').setDescription('OC name').setRequired(true))
            .addStringOption(option => option.setName('song_link').setDescription('Song link').setRequired(true))
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View OC playlist')
            .addStringOption(option => option.setName('oc_name').setDescription('OC name').setRequired(true))
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('shuffle')
            .setDescription('Get a random song from OC playlist')
            .addStringOption(option => option.setName('oc_name').setDescription('OC name').setRequired(true))
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('notes')
        .setDescription('Manage OC notes')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a note to an OC')
            .addStringOption(option => option.setName('oc_name').setDescription('OC name').setRequired(true))
            .addStringOption(option => option.setName('note').setDescription('Note text').setRequired(true))
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View OC notes')
            .addStringOption(option => option.setName('oc_name').setDescription('OC name').setRequired(true))
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();

    if (subcommandGroup === 'playlist') {
      await handlePlaylist(interaction, subcommand);
    } else if (subcommandGroup === 'notes') {
      await handleNotes(interaction, subcommand);
    } else {
      switch (subcommand) {
        case 'add':
          await handleAdd(interaction);
          break;
        case 'edit':
          await handleEdit(interaction);
          break;
        case 'delete':
          await handleDelete(interaction);
          break;
        case 'view':
          await handleView(interaction);
          break;
        case 'list':
          await handleList(interaction);
          break;
        case 'random':
          await handleRandom(interaction);
          break;
      }
    }
  }
};

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const fandom = interaction.options.getString('fandom', true);
  const age = interaction.options.getString('age');
  const race = interaction.options.getString('race');
  const gender = interaction.options.getString('gender');
  const birthday = interaction.options.getString('birthday');
  const bioLink = interaction.options.getString('biolink');
  const imageUrl = interaction.options.getString('image_url');
  const foName = interaction.options.getString('fo_name');
  const foSource = interaction.options.getString('fo_source');
  const relationshipType = interaction.options.getString('relationship_type');

  // Check if OC with same name exists
  const existing = await getOCByName(interaction.guild!.id, name);
  if (existing) {
    await interaction.reply({ embeds: [createErrorEmbed(`An OC named "${name}" already exists!`)], ephemeral: true });
    return;
  }

  // Validate birthday format
  if (birthday && !/^\d{2}-\d{2}$/.test(birthday)) {
    await interaction.reply({ embeds: [createErrorEmbed('Birthday must be in MM-DD format (e.g., 03-15)')], ephemeral: true });
    return;
  }

  // Validate image URL format (must be http/https)
  if (imageUrl && !/^https?:\/\/.+/.test(imageUrl)) {
    await interaction.reply({ embeds: [createErrorEmbed('Image URL must be a valid HTTP/HTTPS URL (must be externally hosted)')], ephemeral: true });
    return;
  }

  const yume = (foName || foSource || relationshipType) ? {
    foName,
    foSource,
    relationshipType
  } : undefined;

  try {
    const oc = await createOC({
      name,
      ownerId: interaction.user.id,
      guildId: interaction.guild!.id,
      fandom,
      age,
      race,
      gender,
      birthday,
      bioLink,
      imageUrl,
      yume
    });

    const embed = formatOCCard(oc);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error creating OC:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to create OC.')], ephemeral: true });
  }
}

async function handleEdit(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const field = interaction.options.getString('field', true);
  const value = interaction.options.getString('value', true);

  const oc = await getOCByName(interaction.guild!.id, name);
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${name}" not found!`)], ephemeral: true });
    return;
  }

  const member = await interaction.guild!.members.fetch(interaction.user.id);
  if (!canManageOC(member, oc.ownerId)) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only edit your own OCs!')], ephemeral: true });
    return;
  }

  // Validate birthday format if editing birthday
  if (field === 'birthday' && !/^\d{2}-\d{2}$/.test(value)) {
    await interaction.reply({ embeds: [createErrorEmbed('Birthday must be in MM-DD format (e.g., 03-15)')], ephemeral: true });
    return;
  }

  // Validate image URL format if editing image URL (allow empty string to clear)
  if (field === 'imageUrl' && value && !/^https?:\/\/.+/.test(value)) {
    await interaction.reply({ embeds: [createErrorEmbed('Image URL must be a valid HTTP/HTTPS URL (must be externally hosted). Use empty string to clear.')], ephemeral: true });
    return;
  }

  try {
    const updates: any = { [field]: value || undefined }; // Convert empty string to undefined
    const updated = await updateOC(oc._id.toString(), updates);
    
    if (!updated) {
      await interaction.reply({ embeds: [createErrorEmbed('Failed to update OC.')], ephemeral: true });
      return;
    }

    const embed = formatOCCard(updated);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error updating OC:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to update OC.')], ephemeral: true });
  }
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);

  const oc = await getOCByName(interaction.guild!.id, name);
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${name}" not found!`)], ephemeral: true });
    return;
  }

  const member = await interaction.guild!.members.fetch(interaction.user.id);
  if (!canManageOC(member, oc.ownerId)) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only delete your own OCs!')], ephemeral: true });
    return;
  }

  try {
    await deleteOC(oc._id.toString());
    await interaction.reply({ embeds: [createSuccessEmbed(`Deleted OC "${name}"`)], ephemeral: true });
  } catch (error) {
    console.error('Error deleting OC:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to delete OC.')], ephemeral: true });
  }
}

async function handleView(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);

  const oc = await getOCByName(interaction.guild!.id, name);
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${name}" not found!`)], ephemeral: true });
    return;
  }

  const embed = formatOCCard(oc);
  await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const filter = interaction.options.getString('filter');
  const value = interaction.options.getString('value');
  const user = interaction.options.getUser('user');

  let ocs: any[] = [];

  try {
    if (filter === 'owner') {
      const targetUser = user || interaction.user;
      ocs = await getOCsByOwner(interaction.guild!.id, targetUser.id);
    } else if (filter === 'fandom' && value) {
      ocs = await getOCsByFandom(interaction.guild!.id, value);
    } else if (filter === 'search' && value) {
      ocs = await searchOCs(interaction.guild!.id, value);
    } else {
      ocs = await getAllOCs(interaction.guild!.id);
    }

    if (ocs.length === 0) {
      await interaction.reply({ embeds: [createErrorEmbed('No OCs found.')], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 OC List (${ocs.length})`)
      .setDescription(formatOCList(ocs))
      .setColor(COLORS.info)
      .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif');

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error listing OCs:', error);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to list OCs.')], ephemeral: true });
  }
}

async function handleRandom(interaction: ChatInputCommandInteraction) {
  const oc = await getRandomOC(interaction.guild!.id);
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed('No OCs found in this server!')], ephemeral: true });
    return;
  }

  const embed = formatOCCard(oc);
  await interaction.reply({ embeds: [embed] });
}

async function handlePlaylist(interaction: ChatInputCommandInteraction, subcommand: string) {
  const ocName = interaction.options.getString('oc_name', true);
  const oc = await getOCByName(interaction.guild!.id, ocName);
  
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" not found!`)], ephemeral: true });
    return;
  }

  const member = await interaction.guild!.members.fetch(interaction.user.id);
  if (!canManageOC(member, oc.ownerId)) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only manage playlists for your own OCs!')], ephemeral: true });
    return;
  }

  if (subcommand === 'add') {
    const songLink = interaction.options.getString('song_link', true);
    const updated = await addPlaylistSong(oc._id.toString(), songLink);
    if (updated) {
      await interaction.reply({ embeds: [createSuccessEmbed(`Added song to ${ocName}'s playlist!`)], ephemeral: true });
    }
  } else if (subcommand === 'remove') {
    const songLink = interaction.options.getString('song_link', true);
    const updated = await removePlaylistSong(oc._id.toString(), songLink);
    if (updated) {
      await interaction.reply({ embeds: [createSuccessEmbed(`Removed song from ${ocName}'s playlist!`)], ephemeral: true });
    }
  } else if (subcommand === 'view') {
    const embed = new EmbedBuilder()
      .setTitle(`🎵 ${ocName}'s Playlist`)
      .setColor(COLORS.secondary);
    
    if (oc.playlist.length === 0) {
      embed.setDescription('No songs in playlist.');
    } else {
      embed.setDescription(oc.playlist.map((link, i) => `${i + 1}. ${link}`).join('\n'));
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (subcommand === 'shuffle') {
    if (oc.playlist.length === 0) {
      await interaction.reply({ embeds: [createErrorEmbed(`${ocName} has no songs in their playlist!`)], ephemeral: true });
      return;
    }
    const randomSong = oc.playlist[Math.floor(Math.random() * oc.playlist.length)];
    const embed = new EmbedBuilder()
      .setTitle(`🎵 Random Song from ${ocName}'s Playlist`)
      .setDescription(randomSong)
      .setColor(COLORS.secondary);
    await interaction.reply({ embeds: [embed] });
  }
}

async function handleNotes(interaction: ChatInputCommandInteraction, subcommand: string) {
  const ocName = interaction.options.getString('oc_name', true);
  const oc = await getOCByName(interaction.guild!.id, ocName);
  
  if (!oc) {
    await interaction.reply({ embeds: [createErrorEmbed(`OC "${ocName}" not found!`)], ephemeral: true });
    return;
  }

  const member = await interaction.guild!.members.fetch(interaction.user.id);
  if (!canManageOC(member, oc.ownerId)) {
    await interaction.reply({ embeds: [createErrorEmbed('You can only manage notes for your own OCs!')], ephemeral: true });
    return;
  }

  if (subcommand === 'add') {
    const note = interaction.options.getString('note', true);
    const updated = await addNote(oc._id.toString(), note);
    if (updated) {
      await interaction.reply({ embeds: [createSuccessEmbed(`Added note to ${ocName}!`)], ephemeral: true });
    }
  } else if (subcommand === 'view') {
    const embed = new EmbedBuilder()
      .setTitle(`📝 ${ocName}'s Notes`)
      .setColor(COLORS.info);
    
    if (oc.notes.length === 0) {
      embed.setDescription('No notes.');
    } else {
      embed.setDescription(oc.notes.map((note, i) => `${i + 1}. ${note}`).join('\n'));
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export default command;

