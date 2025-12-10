import { GuildMember, PermissionFlagsBits } from 'discord.js';

export function isServerOwner(member: GuildMember): boolean {
  return member.id === member.guild.ownerId;
}

export function hasManageServer(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageGuild) || isServerOwner(member);
}

export function canManageOC(member: GuildMember, ownerId: string): boolean {
  return member.id === ownerId || hasManageServer(member);
}

