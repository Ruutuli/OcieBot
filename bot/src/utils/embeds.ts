import { EmbedBuilder, ColorResolvable } from 'discord.js';

// Pastel color palette for OcieBot
export const COLORS = {
  primary: 0xFFB6C1 as ColorResolvable, // Light Pink
  secondary: 0xB0E0E6 as ColorResolvable, // Powder Blue
  success: 0x98D8C8 as ColorResolvable, // Mint
  warning: 0xFFD4A3 as ColorResolvable, // Peach
  error: 0xFFA8A8 as ColorResolvable, // Light Red
  info: 0xD4A5FF as ColorResolvable // Lavender
};

export function createEmbed(title: string, description?: string, color: ColorResolvable = COLORS.primary) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

export function createErrorEmbed(message: string) {
  return createEmbed('❌ Oops!', message, COLORS.error);
}

export function createSuccessEmbed(message: string) {
  return createEmbed('✅ Success!', message, COLORS.success);
}

export function createInfoEmbed(title: string, message: string) {
  return createEmbed(title, message, COLORS.info);
}

