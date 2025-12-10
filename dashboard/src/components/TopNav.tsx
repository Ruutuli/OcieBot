import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './TopNav.css';

interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

export default function TopNav() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.top-nav')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getUserAvatarUrl = (userId: string, avatar: string | undefined) => {
    if (!avatar) return null;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  return (
    <nav className="top-nav">
      <div className="top-nav-left">
      </div>

      <div className="top-nav-center">
        {/* Server selection removed - using hardcoded server */}
      </div>

      <div className="top-nav-right">
        {loading ? (
          <div className="user-profile-loading">
            <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
          </div>
        ) : user ? (
          <div className="user-menu-wrapper">
            <button
              className="user-menu-button"
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
              }}
            >
              <div className="user-avatar-small">
                {getUserAvatarUrl(user.id, user.avatar) ? (
                  <img src={getUserAvatarUrl(user.id, user.avatar)!} alt={user.username} />
                ) : (
                  <div className="user-avatar-placeholder-small">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="user-name-text">{user.username}</span>
              <i className={`fas fa-chevron-down ${showUserDropdown ? 'open' : ''}`}></i>
            </button>

            {showUserDropdown && (
              <div className="dropdown-menu user-dropdown">
                <div className="dropdown-header">
                  <i className="fas fa-user"></i>
                  <span>Account</span>
                </div>
                <div className="user-info-section">
                  <div className="user-info-avatar">
                    {getUserAvatarUrl(user.id, user.avatar) ? (
                      <img src={getUserAvatarUrl(user.id, user.avatar)!} alt={user.username} />
                    ) : (
                      <div className="user-avatar-placeholder-large">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-info-details">
                    <div className="user-info-name">{user.username}</div>
                    <div className="user-info-discriminator">#{user.discriminator}</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="login-button-top" onClick={() => navigate('/login')}>
            <i className="fab fa-discord"></i>
            <span>Login</span>
          </button>
        )}
      </div>
    </nav>
  );
}

