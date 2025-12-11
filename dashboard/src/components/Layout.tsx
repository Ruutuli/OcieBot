import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TopNav from './TopNav';
import api from '../services/api';
import './Layout.css';

const ADMIN_USER_ID = '211219306137124865';

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Check admin status from API
        const adminRes = await api.get('/admin/check').catch((err: any) => {
          // Don't log 429 errors
          if (err.response?.status !== 429) {
            console.error('Failed to fetch admin status:', err);
          }
          return { data: { isAdmin: false } };
        });
        setIsAdmin(adminRes.data.isAdmin || false);
      } catch (error: any) {
        // Don't log 429 errors
        if (error.response?.status !== 429) {
          console.error('Failed to fetch admin status:', error);
        }
        // Fallback to original admin check
        try {
          const res = await api.get('/auth/me');
          setIsAdmin(res.data.user.id === ADMIN_USER_ID);
        } catch (err: any) {
          // Don't log 429 errors
          if (err.response?.status !== 429) {
            console.error('Failed to fetch user:', err);
          }
        }
      }
    };

    fetchUser();
  }, []);


  const navItems = [
    { path: '/', label: 'Home', icon: 'fa-home' },
    { path: '/ocs', label: 'OCs', icon: 'fa-star' },
    { path: '/fandoms', label: 'Fandoms', icon: 'fa-theater-masks' },
    { path: '/yumeships', label: 'Yumeships', icon: 'fa-heart' },
    { path: '/birthdays', label: 'Birthdays', icon: 'fa-birthday-cake' },
    { path: '/cotw', label: 'COTW', icon: 'fa-crown' },
    { path: '/qotd', label: 'QOTD', icon: 'fa-question-circle' },
    { path: '/prompts', label: 'Prompts', icon: 'fa-lightbulb' },
    { path: '/trivia', label: 'Trivia', icon: 'fa-brain' },
    { path: '/stats', label: 'Stats', icon: 'fa-chart-bar' },
    ...(isAdmin ? [
      { path: '/settings', label: 'Settings', icon: 'fa-cog' },
      { path: '/admin', label: 'Admin', icon: 'fa-wrench' }
    ] : [])
  ];

  return (
    <div className={`layout ${sidebarOpen && !isMobile ? 'sidebar-open' : 'sidebar-closed'}`}>
      <TopNav />
      {isMobile && (
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      )}
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>OcieBot</h1>
          <p><i className="fas fa-star"></i> OC Management</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <span className="nav-icon"><i className={`fas ${item.icon}`}></i></span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className={`main-content ${!sidebarOpen && isMobile ? 'full-width' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

