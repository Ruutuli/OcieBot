import { useEffect, useState } from 'react';
import api from '../services/api';
import { GUILD_ID } from '../constants';
import './Stats.css';

export default function Stats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get('/stats', { params: { guildId: GUILD_ID } })
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to load statistics');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="stats-page">
        <h1>Statistics</h1>
        <div className="stats-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '16px' }}></div>
              <div className="skeleton" style={{ height: '48px', width: '80%' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page">
        <h1>Statistics</h1>
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-page">
        <h1>Statistics</h1>
        <div className="no-data">
          <i className="fas fa-chart-bar"></i>
          <p>No statistics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <h1>Statistics</h1>
      
      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>View comprehensive statistics about your server including OC counts, fandom distribution, user activity, and content statistics. This page provides insights into your server's usage and helps you understand trends over time.</span>
      </p>
      
      <div className="stats-section">
        <h2><i className="fas fa-star"></i> OCs Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3><i className="fas fa-star"></i> Total OCs</h3>
            <p className="stat-value">{stats.ocs.total}</p>
          </div>
          <div className="stat-card">
            <h3><i className="fas fa-heart"></i> With Yume</h3>
            <p className="stat-value">{stats.ocs.withYume}</p>
          </div>
          <div className="stat-card">
            <h3><i className="fas fa-birthday-cake"></i> With Birthdays</h3>
            <p className="stat-value">{stats.ocs.withBirthdays}</p>
          </div>
          <div className="stat-card">
            <h3><i className="fas fa-music"></i> With Playlists</h3>
            <p className="stat-value">{stats.ocs.withPlaylists}</p>
          </div>
          <div className="stat-card">
            <h3><i className="fas fa-calendar-plus"></i> New This Month</h3>
            <p className="stat-value">{stats.ocs.newThisMonth}</p>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h2><i className="fas fa-theater-masks"></i> Fandoms</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3><i className="fas fa-theater-masks"></i> Total Fandoms</h3>
            <p className="stat-value">{stats.fandoms.total}</p>
          </div>
        </div>
        {stats.fandoms.top5 && stats.fandoms.top5.length > 0 && (
          <div className="top-fandoms">
            <h3>Top 5 Fandoms</h3>
            <div className="fandoms-list">
              {stats.fandoms.top5.map((item: any, index: number) => (
                <div key={index} className="fandom-item">
                  <span className="fandom-rank">#{index + 1}</span>
                  <span className="fandom-name">{item.fandom}</span>
                  <span className="fandom-count">{item.count} OCs</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="stats-section">
        <h2><i className="fas fa-users"></i> Users</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3><i className="fas fa-users"></i> Total Users</h3>
            <p className="stat-value">{stats.users.total}</p>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h2><i className="fas fa-file-alt"></i> Content</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3><i className="fas fa-question-circle"></i> QOTDs</h3>
            <p className="stat-value">{stats.content.qotds}</p>
          </div>
          <div className="stat-card">
            <h3><i className="fas fa-pencil-alt"></i> Prompts</h3>
            <p className="stat-value">{stats.content.prompts}</p>
          </div>
          <div className="stat-card">
            <h3><i className="fas fa-brain"></i> Trivia</h3>
            <p className="stat-value">{stats.content.trivia}</p>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h2><i className="fas fa-crown"></i> Features</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3><i className="fas fa-crown"></i> COTWs</h3>
            <p className="stat-value">{stats.features.cotws}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
