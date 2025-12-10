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
    // Pass the current origin so the API knows where to redirect back
    const currentOrigin = window.location.origin;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/api/auth/discord?origin=${encodeURIComponent(currentOrigin)}`;
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

