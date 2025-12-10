import { useState, useEffect } from 'react';
import { getConfig, updateConfig, getChannels } from '../services/api';
import { GUILD_ID } from '../constants';
import LoadingSpinner from '../components/LoadingSpinner';
import FormField from '../components/FormField';
import './Settings.css';

interface ServerConfig {
  guildId: string;
  channels: {
    cotw?: string;
    birthdays?: string;
    qotd?: string;
    prompts?: string;
    logs?: string;
  };
  features: {
    cotw: boolean;
    birthdays: boolean;
    qotd: boolean;
    prompts: boolean;
    trivia: boolean;
    playlists: boolean;
  };
  schedules: {
    cotw: {
      enabled: boolean;
      dayOfWeek: number;
      time: string;
    };
    qotd: {
      enabled: boolean;
      frequency: 'daily' | 'every2days' | 'every3days' | 'weekly';
      time: string;
    };
    birthdays: {
      enabled: boolean;
      time: string;
    };
  };
  timezone: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC'
];

interface Channel {
  id: string;
  name: string;
  type: number;
}



export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
    fetchChannels();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getConfig(GUILD_ID);
      setConfig(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      setChannelsLoading(true);
      const response = await getChannels(GUILD_ID);
      setChannels(response.data);
    } catch (err: any) {
      console.error('Failed to fetch channels:', err);
      // Don't show error to user, just log it - channels dropdown will be empty
    } finally {
      setChannelsLoading(false);
    }
  };



  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      // Send the full config object (API expects guildId + config fields)
      await updateConfig(GUILD_ID, {
        channels: config.channels,
        features: config.features,
        schedules: config.schedules,
        timezone: config.timezone
      });
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateChannel = (key: keyof ServerConfig['channels'], value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      channels: {
        ...config.channels,
        [key]: value || undefined
      }
    });
  };

  const toggleFeature = (key: keyof ServerConfig['features']) => {
    if (!config) return;
    setConfig({
      ...config,
      features: {
        ...config.features,
        [key]: !config.features[key]
      }
    });
  };

  const updateSchedule = (
    scheduleType: 'cotw' | 'qotd' | 'birthdays',
    updates: Partial<ServerConfig['schedules'][typeof scheduleType]>
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      schedules: {
        ...config.schedules,
        [scheduleType]: {
          ...config.schedules[scheduleType],
          ...updates
        }
      }
    });
  };


  if (loading) {
    return (
      <div className="settings-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="settings-page">
        <div className="settings-error">
          <i className="fas fa-exclamation-circle"></i> Failed to load settings
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Server Settings</h1>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Saving...
            </>
          ) : (
            <>
              <i className="fas fa-save"></i> Save Changes
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="settings-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {success && (
        <div className="settings-success">
          <i className="fas fa-check-circle"></i> {success}
        </div>
      )}

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>Configure your server settings including Discord channels for different features, enable/disable features, set up automated schedules, and configure your server timezone. Remember to click <strong>Save Changes</strong> after making any modifications.</span>
      </p>

      <div className="settings-content">
        {/* Channels Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2>
              <i className="fas fa-hashtag"></i> Channels
            </h2>
            <p className="settings-section-description">
              Select which Discord channels are used for different features.
            </p>
          </div>
          <div className="settings-section-content">
            {channelsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <LoadingSpinner size="md" />
                <p style={{ marginTop: '1rem', color: 'var(--color-text-light)' }}>Loading channels...</p>
              </div>
            ) : channels.length === 0 ? (
              <div className="settings-error">
                <i className="fas fa-exclamation-circle"></i> Unable to load channels. Please make sure the bot has access to view channels.
              </div>
            ) : (
              <div className="settings-grid">
                <FormField
                  label="COTW Channel"
                  name="cotwChannel"
                  type="select"
                  value={config.channels.cotw || ''}
                  onChange={(value) => updateChannel('cotw', value)}
                  options={[
                    { value: '', label: 'None' },
                    ...channels.map(ch => ({ value: ch.id, label: `# ${ch.name}` }))
                  ]}
                />
                <FormField
                  label="Birthdays Channel"
                  name="birthdaysChannel"
                  type="select"
                  value={config.channels.birthdays || ''}
                  onChange={(value) => updateChannel('birthdays', value)}
                  options={[
                    { value: '', label: 'None' },
                    ...channels.map(ch => ({ value: ch.id, label: `# ${ch.name}` }))
                  ]}
                />
                <FormField
                  label="QOTD Channel"
                  name="qotdChannel"
                  type="select"
                  value={config.channels.qotd || ''}
                  onChange={(value) => updateChannel('qotd', value)}
                  options={[
                    { value: '', label: 'None' },
                    ...channels.map(ch => ({ value: ch.id, label: `# ${ch.name}` }))
                  ]}
                />
                <FormField
                  label="Prompts Channel"
                  name="promptsChannel"
                  type="select"
                  value={config.channels.prompts || ''}
                  onChange={(value) => updateChannel('prompts', value)}
                  options={[
                    { value: '', label: 'None' },
                    ...channels.map(ch => ({ value: ch.id, label: `# ${ch.name}` }))
                  ]}
                />
                <FormField
                  label="Logs Channel"
                  name="logsChannel"
                  type="select"
                  value={config.channels.logs || ''}
                  onChange={(value) => updateChannel('logs', value)}
                  options={[
                    { value: '', label: 'None' },
                    ...channels.map(ch => ({ value: ch.id, label: `# ${ch.name}` }))
                  ]}
                />
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2>
              <i className="fas fa-toggle-on"></i> Features
            </h2>
            <p className="settings-section-description">
              Enable or disable bot features for your server.
            </p>
          </div>
          <div className="settings-section-content">
            <div className="settings-features-grid">
              {Object.entries(config.features).map(([key, enabled]) => (
                <div key={key} className="settings-feature-item">
                  <div className="settings-feature-info">
                    <label className="settings-feature-label">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </label>
                    <span className="settings-feature-description">
                      {key === 'cotw' && 'Character of the Week feature'}
                      {key === 'birthdays' && 'Birthday announcements'}
                      {key === 'qotd' && 'Question of the Day feature'}
                      {key === 'prompts' && 'RP prompts feature'}
                      {key === 'trivia' && 'Trivia games feature'}
                      {key === 'playlists' && 'OC playlist feature'}
                    </span>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleFeature(key as keyof ServerConfig['features'])}
                    />
                    <span className="settings-toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Schedules Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2>
              <i className="fas fa-clock"></i> Schedules
            </h2>
            <p className="settings-section-description">
              Configure automated schedules for various features.
            </p>
          </div>
          <div className="settings-section-content">
            {/* COTW Schedule */}
            <div className="settings-schedule-item">
              <div className="settings-schedule-header">
                <h3>Character of the Week</h3>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={config.schedules.cotw.enabled}
                    onChange={(e) => updateSchedule('cotw', { enabled: e.target.checked })}
                  />
                  <span className="settings-toggle-slider"></span>
                </label>
              </div>
              {config.schedules.cotw.enabled && (
                <div className="settings-schedule-options">
                  <FormField
                    label="Day of Week"
                    name="cotwDay"
                    type="select"
                    value={config.schedules.cotw.dayOfWeek.toString()}
                    onChange={(value) => updateSchedule('cotw', { dayOfWeek: parseInt(value) })}
                    options={DAYS_OF_WEEK.map(day => ({ value: day.value.toString(), label: day.label }))}
                  />
                  <FormField
                    label="Time (HH:mm)"
                    name="cotwTime"
                    type="text"
                    value={config.schedules.cotw.time}
                    onChange={(value) => updateSchedule('cotw', { time: value })}
                    placeholder="12:00"
                  />
                </div>
              )}
            </div>

            {/* QOTD Schedule */}
            <div className="settings-schedule-item">
              <div className="settings-schedule-header">
                <h3>Question of the Day</h3>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={config.schedules.qotd.enabled}
                    onChange={(e) => updateSchedule('qotd', { enabled: e.target.checked })}
                  />
                  <span className="settings-toggle-slider"></span>
                </label>
              </div>
              {config.schedules.qotd.enabled && (
                <div className="settings-schedule-options">
                  <FormField
                    label="Frequency"
                    name="qotdFrequency"
                    type="select"
                    value={config.schedules.qotd.frequency}
                    onChange={(value) => updateSchedule('qotd', { frequency: value as 'daily' | 'every2days' | 'every3days' | 'weekly' })}
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'every2days', label: 'Every 2 Days' },
                      { value: 'every3days', label: 'Every 3 Days' },
                      { value: 'weekly', label: 'Weekly' }
                    ]}
                  />
                  <FormField
                    label="Time (HH:mm)"
                    name="qotdTime"
                    type="text"
                    value={config.schedules.qotd.time}
                    onChange={(value) => updateSchedule('qotd', { time: value })}
                    placeholder="19:00"
                  />
                </div>
              )}
            </div>

            {/* Birthdays Schedule */}
            <div className="settings-schedule-item">
              <div className="settings-schedule-header">
                <h3>Birthday Announcements</h3>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={config.schedules.birthdays.enabled}
                    onChange={(e) => updateSchedule('birthdays', { enabled: e.target.checked })}
                  />
                  <span className="settings-toggle-slider"></span>
                </label>
              </div>
              {config.schedules.birthdays.enabled && (
                <div className="settings-schedule-options">
                  <FormField
                    label="Time (HH:mm)"
                    name="birthdaysTime"
                    type="text"
                    value={config.schedules.birthdays.time}
                    onChange={(value) => updateSchedule('birthdays', { time: value })}
                    placeholder="00:01"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Timezone Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2>
              <i className="fas fa-globe"></i> Timezone
            </h2>
            <p className="settings-section-description">
              Set your server's timezone for scheduled events.
            </p>
          </div>
          <div className="settings-section-content">
            <FormField
              label="Server Timezone"
              name="timezone"
              type="select"
              value={config.timezone}
              onChange={(value) => setConfig({ ...config, timezone: value })}
              options={COMMON_TIMEZONES.map(tz => ({ value: tz, label: tz }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
