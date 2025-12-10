import { EmbedBuilder } from 'discord.js';
import { IOC } from '../database/models/OC';
import { COLORS } from './embeds';

export function formatOCCard(oc: IOC): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`✨ ${oc.name}`)
    .setColor(COLORS.primary)
    .setImage('https://i.pinimg.com/originals/d3/52/da/d352da598c7a499ee968f5c61939f892.gif')
    .setTimestamp(oc.updatedAt);

  // Set character icon (thumbnail) if available
  if (oc.imageUrl) {
    embed.setThumbnail(oc.imageUrl);
  }

  const fields: { name: string; value: string; inline?: boolean }[] = [];

  fields.push({ name: '👤 Owner', value: `<@${oc.ownerId}>`, inline: false });
  fields.push({ name: '🎭 Fandom', value: oc.fandom, inline: false });

  if (oc.age) fields.push({ name: '🎂 Age', value: oc.age, inline: false });
  if (oc.race) fields.push({ name: '🧬 Race/Species', value: oc.race, inline: false });
  if (oc.gender) fields.push({ name: '⚧️ Gender', value: oc.gender, inline: false });
  if (oc.birthday) fields.push({ name: '🎉 Birthday', value: oc.birthday, inline: false });
  if (oc.bioLink) fields.push({ name: '🔗 Bio Link', value: oc.bioLink, inline: false });

  if (oc.yume) {
    let yumeText = '';
    if (oc.yume.foName) yumeText += `**F/O:** ${oc.yume.foName}\n`;
    if (oc.yume.foSource) yumeText += `**Source:** ${oc.yume.foSource}\n`;
    if (oc.yume.relationshipType) yumeText += `**Type:** ${oc.yume.relationshipType}\n`;
    
    if (yumeText) {
      fields.push({ name: '💕 Yume Info', value: yumeText, inline: false });
    }
  }

  if (oc.playlist && oc.playlist.length > 0) {
    fields.push({ name: '🎵 Playlist', value: `${oc.playlist.length} song(s)`, inline: false });
  }

  if (oc.notes && oc.notes.length > 0) {
    fields.push({ name: '📝 Notes', value: `${oc.notes.length} note(s)`, inline: false });
  }

  embed.addFields(fields);

  return embed;
}

export function formatOCList(ocs: IOC[]): string {
  if (ocs.length === 0) return 'No OCs found.';
  
  return ocs.map((oc, index) => {
    let line = `${index + 1}. **${oc.name}** (${oc.fandom})`;
    if (oc.birthday) line += ` 🎂 ${oc.birthday}`;
    return line;
  }).join('\n');
}

