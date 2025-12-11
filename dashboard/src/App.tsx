import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import OCManager from './pages/OCManager';
import FandomDirectory from './pages/FandomDirectory';
import BirthdayCalendar from './pages/BirthdayCalendar';
import COTW from './pages/COTW';
import QOTDManager from './pages/QOTDManager';
import PromptManager from './pages/PromptManager';
import TriviaManager from './pages/TriviaManager';
import Stats from './pages/Stats';
import Yumeships from './pages/Yumeships';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Layout from './components/Layout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      setLoading(false);
    };

    checkAuth();

    // Listen for storage changes (logout from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        checkAuth();
      }
    };

    // Listen for custom token change events (same-tab changes)
    const handleTokenChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenChanged', handleTokenChange);
    
    // Also check auth when location changes (handles navigation after login)
    const handleLocationChange = () => {
      checkAuth();
    };
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenChanged', handleTokenChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--gradient-bg)',
        backgroundAttachment: 'fixed'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', fontWeight: 500 }}>
            Loading OcieBot...
          </p>
        </div>
      </div>
    );
  }

  // Railway deployments use root path
  const basename = import.meta.env.VITE_BASE_PATH || '';

  return (
    <BrowserRouter 
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<Login />} />
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Home />} />
          <Route path="ocs" element={<OCManager />} />
          <Route path="fandoms" element={<FandomDirectory />} />
          <Route path="birthdays" element={<BirthdayCalendar />} />
          <Route path="cotw" element={<COTW />} />
          <Route path="qotd" element={<QOTDManager />} />
          <Route path="prompts" element={<PromptManager />} />
          <Route path="trivia" element={<TriviaManager />} />
          <Route path="yumeships" element={<Yumeships />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

