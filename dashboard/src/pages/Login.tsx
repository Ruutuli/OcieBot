import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      navigate('/');
    }
  }, [token, navigate]);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/discord`;
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1><i className="fas fa-star"></i> OcieBot</h1>
        <p>Welcome to OcieBot Dashboard</p>
        <button onClick={handleLogin} className="login-button">
          <i className="fab fa-discord"></i> Login with Discord
        </button>
      </div>
    </div>
  );
}

