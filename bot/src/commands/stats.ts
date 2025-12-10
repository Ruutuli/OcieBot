import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { createErrorEmbed, COLORS } from '../utils/embeds';
import { getAllOCs } from '../services/ocService';
import { getQOTDsByGuild } from '../services/qotdService';
import { getPromptsByGuild } from '../services/promptService';
import { getTriviaByGuild } from '../services/triviaService';
import { getCOTWHistory } from '../modules/cotw';
import { startOfMonth } from 'date-fns';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View server statistics'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server!')], ephemeral: true });
      return;
    }

    try {
      const ocs = await getAllOCs(interaction.guild.id);
      const qotds = await getQOTDsByGuild(interaction.guild.id);
      const prompts = await getPromptsByGuild(interaction.guild.id);
      const trivias = await getTriviaByGuild(interaction.guild.id);
      const cotwHistory = await getCOTWHistory(interaction.guild.id, 100);

      // Calculate OC stats
      const totalOCs = ocs.length;
      const ocsWithYume = ocs.filter(oc => oc.yume).length;
      const ocsWithBirthdays = ocs.filter(oc => oc.birthday).length;
      const ocsWithPlaylists = ocs.filter(oc => oc.playlist && oc.playlist.length > 0).length;

      // Fandom stats
      const fandomCounts = new Map<string, number>();
      const userCounts = new Map<string, number>();
      
      for (const oc of ocs) {
        fandomCounts.set(oc.fandom, (fandomCounts.get(oc.fandom) || 0) + 1);
        userCounts.set(oc.ownerId, (userCounts.get(oc.ownerId) || 0) + 1);
      }

      const totalFandoms = fandomCounts.size;
      const totalUsers = userCounts.size;
      const topFandoms = Array.from(fandomCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // New OCs this month
      const monthStart = startOfMonth(new Date());
      const newOCsThisMonth = ocs.filter(oc => oc.createdAt >= monthStart).length;

      // COTW stats
      const totalCOTWs = cotwHistory.length;

      // Content stats
      const totalQOTDs = qotds.length;
      const totalPrompts = prompts.length;
      const totalTrivia = trivias.length;

      const embed = new EmbedBuilder()
        .setTitle('📊 Server Statistics')
        .setColor(COLORS.info)
        .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
        .addFields(
          { name: '👥 OCs', value: 
            `Total: **${totalOCs}**\n` +
            `With Yume: **${ocsWithYume}**\n` +
            `With Birthdays: **${ocsWithBirthdays}**\n` +
            `With Playlists: **${ocsWithPlaylists}**\n` +
            `New This Month: **${newOCsThisMonth}**`, inline: true },
          { name: '🎭 Fandoms', value:
            `Total: **${totalFandoms}**\n` +
            `Top 5:\n${topFandoms.map(([fandom, count]) => `• ${fandom}: ${count}`).join('\n')}`, inline: true },
          { name: '👤 Users', value: `Total: **${totalUsers}**`, inline: true },
          { name: '💭 Content', value:
            `QOTDs: **${totalQOTDs}**\n` +
            `Prompts: **${totalPrompts}**\n` +
            `Trivia: **${totalTrivia}**`, inline: true },
          { name: '💫 Features', value: `COTWs: **${totalCOTWs}**`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error getting stats:', error);
      await interaction.reply({ embeds: [createErrorEmbed('Failed to get statistics.')], ephemeral: true });
    }
  }
};

export default command;

