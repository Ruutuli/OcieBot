import { useEffect, useState } from 'react';
import api from '../services/api';
import { GUILD_ID } from '../constants';
import './Home.css';

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/stats', { params: { guildId: GUILD_ID } })
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="home-page">
        <h1>Dashboard</h1>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '16px' }}></div>
              <div className="skeleton" style={{ height: '48px', width: '80%' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="home-page">
        <h1>Welcome to OcieBot Dashboard</h1>
        <div className="welcome-section">
          <div className="welcome-card">
            <div className="welcome-icon">
              <i className="fas fa-star"></i>
            </div>
            <h2>Get Started</h2>
            <p className="welcome-text">
              Welcome to the OcieBot Dashboard! This dashboard helps you manage your Original Characters, organize fandoms, track birthdays, and configure bot settings.
            </p>
            <div className="invite-section">
              <a 
                href="https://discord.com/oauth2/authorize?client_id=1448213720693215286&permissions=8&integration_type=0&scope=bot+applications.commands" 
                target="_blank" 
                rel="noopener noreferrer"
                className="invite-button"
              >
                <i className="fab fa-discord"></i>
                Invite the bot to your server!
              </a>
            </div>
            <div className="welcome-instructions">
              <h3>Getting Started:</h3>
              <ol>
                <li><strong>Add Your OCs:</strong> Go to the <strong>OC Manager</strong> page to add your Original Characters. You can include names, fandoms, birthdays, and more.</li>
                <li><strong>Set Birthdays:</strong> To see birthdays on the Birthday Calendar, add an OC and set their birthday using the MM-DD format (e.g., 03-15 for March 15th).</li>
                <li><strong>Organize Fandoms:</strong> Use the <strong>Fandom Directory</strong> to organize your OCs by their respective fandoms.</li>
                <li><strong>Explore Features:</strong> Check out the Character of the Week, QOTD Manager, and Settings pages to customize your experience.</li>
              </ol>
            </div>
            <div className="welcome-features">
              <div className="feature-item">
                <i className="fas fa-star"></i>
                <span>Manage OCs</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-theater-masks"></i>
                <span>Organize Fandoms</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-birthday-cake"></i>
                <span>Track Birthdays</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-crown"></i>
                <span>Character of the Week</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Welcome to OcieBot Dashboard</h1>
        <p className="page-instructions">
          <i className="fas fa-info-circle"></i> This dashboard helps you manage your OCs, fandoms, birthdays, and more. Use the navigation menu on the left to access different features.
        </p>
        <div className="invite-section">
          <a 
            href="https://discord.com/oauth2/authorize?client_id=1448213720693215286&permissions=8&integration_type=0&scope=bot+applications.commands" 
            target="_blank" 
            rel="noopener noreferrer"
            className="invite-button"
          >
            <i className="fab fa-discord"></i>
            Invite the bot to your server!
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3><i className="fas fa-star"></i> Total OCs</h3>
          <p className="stat-value">{stats.ocs.total}</p>
          <p className="stat-help">Manage your OCs in the OC Manager</p>
        </div>
        <div className="stat-card">
          <h3><i className="fas fa-theater-masks"></i> Fandoms</h3>
          <p className="stat-value">{stats.fandoms.total}</p>
          <p className="stat-help">Organize your OCs by fandom</p>
        </div>
        <div className="stat-card">
          <h3><i className="fas fa-users"></i> Users</h3>
          <p className="stat-value">{stats.users.total}</p>
          <p className="stat-help">Users with OCs in this server</p>
        </div>
        <div className="stat-card">
          <h3><i className="fas fa-question-circle"></i> QOTDs</h3>
          <p className="stat-value">{stats.content.qotds}</p>
          <p className="stat-help">Questions of the Day available</p>
        </div>
      </div>

      <div className="dashboard-guide">
        <h2>How to Use the Dashboard</h2>
        <div className="guide-grid">
          <div className="guide-item">
            <div className="guide-icon">
              <i className="fas fa-star"></i>
            </div>
            <h3>OC Manager</h3>
            <p>Add, edit, and manage your Original Characters. You can set birthdays, add playlists, notes, and more. To have your OCs' birthdays display on the Birthday Calendar, add an OC and set their birthday using the MM-DD format.</p>
          </div>
          <div className="guide-item">
            <div className="guide-icon">
              <i className="fas fa-birthday-cake"></i>
            </div>
            <h3>Birthday Calendar</h3>
            <p>View all your OCs' birthdays in a beautiful calendar view. Your OCs' birthdays will display here once you add them using the OC Manager page. Navigate through months to see upcoming birthdays.</p>
          </div>
          <div className="guide-item">
            <div className="guide-icon">
              <i className="fas fa-theater-masks"></i>
            </div>
            <h3>Fandom Directory</h3>
            <p>Organize your OCs by fandom. Create and manage fandoms, and keep everything organized.</p>
          </div>
          <div className="guide-item">
            <div className="guide-icon">
              <i className="fas fa-crown"></i>
            </div>
            <h3>Character of the Week</h3>
            <p>View the current Character of the Week and see the history of past winners. Reroll to get a new random OC.</p>
          </div>
          <div className="guide-item">
            <div className="guide-icon">
              <i className="fas fa-question-circle"></i>
            </div>
            <h3>QOTD Manager</h3>
            <p>Manage Questions of the Day. Add new questions with categories to keep your server engaged.</p>
          </div>
          <div className="guide-item">
            <div className="guide-icon">
              <i className="fas fa-cog"></i>
            </div>
            <h3>Settings</h3>
            <p>Configure bot settings, channels, roles, and other server-specific options. Customize how OcieBot works in your server.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

