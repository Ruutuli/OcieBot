import mongoose, { Schema, Document } from 'mongoose';

export interface IFeatureToggles {
  cotw: boolean;
  birthdays: boolean;
  qotd: boolean;
  prompts: boolean;
  trivia: boolean;
  playlists: boolean;
}

export interface ISchedules {
  cotw: {
    enabled: boolean;
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    time: string; // HH:mm format
  };
  qotd: {
    enabled: boolean;
    frequency: 'daily' | 'every2days' | 'every3days' | 'weekly';
    time: string; // HH:mm format
    lastPosted?: Date; // Track last posted date for interval-based frequencies
  };
  birthdays: {
    enabled: boolean;
    time: string; // HH:mm format
  };
}

export interface IChannels {
  cotw?: string;
  birthdays?: string;
  qotd?: string;
  prompts?: string;
  logs?: string;
}

export interface IServerConfig extends Document {
  guildId: string;
  channels: IChannels;
  features: IFeatureToggles;
  schedules: ISchedules;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServerConfigSchema = new Schema<IServerConfig>({
  guildId: { type: String, required: true, unique: true },
  channels: {
    cotw: String,
    birthdays: String,
    qotd: String,
    prompts: String,
    logs: String
  },
  features: {
    cotw: { type: Boolean, default: true },
    birthdays: { type: Boolean, default: true },
    qotd: { type: Boolean, default: true },
    prompts: { type: Boolean, default: true },
    trivia: { type: Boolean, default: true },
    playlists: { type: Boolean, default: true }
  },
  schedules: {
    cotw: {
      enabled: { type: Boolean, default: false },
      dayOfWeek: { type: Number, default: 1 }, // Monday
      time: { type: String, default: '12:00' }
    },
    qotd: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'every2days', 'every3days', 'weekly'], default: 'daily' },
      time: { type: String, default: '19:00' },
      lastPosted: { type: Date, required: false }
    },
    birthdays: {
      enabled: { type: Boolean, default: true },
      time: { type: String, default: '00:01' }
    }
  },
  timezone: { type: String, default: 'America/New_York' }
}, {
  timestamps: true
});

export const ServerConfig = mongoose.model<IServerConfig>('ServerConfig', ServerConfigSchema);

