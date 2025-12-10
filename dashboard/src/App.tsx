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
import Settings from './pages/Settings';
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

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  return (
    <BrowserRouter>
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
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

