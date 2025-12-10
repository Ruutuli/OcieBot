import { ServerConfig, IServerConfig } from '../database/models/ServerConfig';

export async function getServerConfig(guildId: string): Promise<IServerConfig | null> {
  return await ServerConfig.findOne({ guildId });
}

export async function getOrCreateServerConfig(guildId: string): Promise<IServerConfig> {
  let config = await ServerConfig.findOne({ guildId });
  
  if (!config) {
    config = new ServerConfig({ guildId });
    await config.save();
  }
  
  return config;
}

export async function updateServerConfig(guildId: string, updates: Partial<IServerConfig>): Promise<IServerConfig> {
  const config = await getOrCreateServerConfig(guildId);
  Object.assign(config, updates);
  await config.save();
  return config;
}

