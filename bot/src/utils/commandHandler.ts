import { Collection, REST, Routes, Client, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: any) => Promise<void>;
  autocomplete?: (interaction: any) => Promise<void>;
}

export async function loadCommands(client: Client): Promise<Collection<string, Command>> {
  const commands = new Collection<string, Command>();
  const commandsPath = join(__dirname, '../commands');
  const commandFiles = readdirSync(commandsPath).filter(file => 
    file.endsWith('.js') && !file.endsWith('.d.ts')
  );

  for (const file of commandFiles) {
    try {
      // Use require for CommonJS modules (compiled output)
      const filePath = join(commandsPath, file);
      const commandModule = require(filePath);
      const command = commandModule.default || commandModule;
      
      if (command && 'data' in command && 'execute' in command) {
        commands.set(command.data.name, command);
      } else {
        logger.warn(`Command file ${file} does not export a valid command structure`);
      }
    } catch (error) {
      logger.error(`Error loading command ${file}: ${error}`);
    }
  }

  return commands;
}

export async function registerCommandsForGuild(guildId: string, commands: Collection<string, Command>): Promise<void> {
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
  const clientId = process.env.DISCORD_CLIENT_ID!;

  const commandsData = commands.map(cmd => cmd.data.toJSON());

  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commandsData }
    ) as any[];

    logger.success(`Successfully registered ${data.length} commands for guild: ${guildId}`);
  } catch (error) {
    logger.error(`Error registering commands for guild ${guildId}: ${error}`);
    throw error;
  }
}

export async function registerCommands(client: Client, commands: Collection<string, Command>): Promise<void> {
  const commandsData = commands.map(cmd => cmd.data.toJSON());

  try {
    logger.info(`Started refreshing ${commandsData.length} application (/) commands for all guilds.`);

    // Register commands for each guild (updates immediately)
    const guilds = client.guilds.cache;
    let successCount = 0;
    let failCount = 0;

    for (const guild of guilds.values()) {
      try {
        await registerCommandsForGuild(guild.id, commands);
        successCount++;
      } catch (error) {
        logger.error(`Error registering commands for guild ${guild.name} (${guild.id}): ${error}`);
        failCount++;
      }
    }

    logger.success(`Successfully reloaded commands for ${successCount} guild(s).${failCount > 0 ? ` Failed for ${failCount} guild(s).` : ''}`);
  } catch (error) {
    logger.error(`Error registering commands: ${error}`);
  }
}

