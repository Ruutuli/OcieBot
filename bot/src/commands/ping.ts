import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../utils/commandHandler';
import { createSuccessEmbed } from '../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = createSuccessEmbed(`🏓 Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`);
    await interaction.reply({ embeds: [embed] });
  }
};

export default command;

