import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUILD_ID } from '../constants';
import api from '../services/api';
import './Admin.css';

const ADMIN_USER_ID = '211219306137124865';

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [qotdCategory, setQotdCategory] = useState<string>('');
  const [qotdChannelId, setQotdChannelId] = useState<string>('');
  const [qotdId, setQotdId] = useState<string>('');
  const [qotdLoading, setQotdLoading] = useState(false);
  const [qotdResult, setQotdResult] = useState<string>('');

  const [promptCategory, setPromptCategory] = useState<string>('');
  const [promptChannelId, setPromptChannelId] = useState<string>('');
  const [promptId, setPromptId] = useState<string>('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptResult, setPromptResult] = useState<string>('');

  const [cotwOcId, setCotwOcId] = useState<string>('');
  const [cotwChannelId, setCotwChannelId] = useState<string>('');
  const [cotwLoading, setCotwLoading] = useState(false);
  const [cotwResult, setCotwResult] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.user;
      setUser(userData);
      
      if (userData.id === ADMIN_USER_ID) {
        setAuthorized(true);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleTestQOTD = async () => {
    setQotdLoading(true);
    setQotdResult('');
    
    try {
      const response = await api.post('/admin/test/qotd', {
        guildId: GUILD_ID,
        category: qotdCategory || undefined,
        channelId: qotdChannelId || undefined,
        qotdId: qotdId || undefined
      });
      
      setQotdResult(`✅ Success! Posted QOTD: "${response.data.qotd.question}"\nMessage ID: ${response.data.messageId}`);
    } catch (error: any) {
      setQotdResult(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setQotdLoading(false);
    }
  };

  const handleTestPrompt = async () => {
    setPromptLoading(true);
    setPromptResult('');
    
    try {
      const response = await api.post('/admin/test/prompt', {
        guildId: GUILD_ID,
        category: promptCategory || undefined,
        channelId: promptChannelId || undefined,
        promptId: promptId || undefined
      });
      
      setPromptResult(`✅ Success! Posted Prompt: "${response.data.prompt.text}"\nMessage ID: ${response.data.messageId}`);
    } catch (error: any) {
      setPromptResult(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setPromptLoading(false);
    }
  };

  const handleTestCOTW = async () => {
    setCotwLoading(true);
    setCotwResult('');
    
    try {
      const response = await api.post('/admin/test/cotw', {
        guildId: GUILD_ID,
        ocId: cotwOcId || undefined,
        channelId: cotwChannelId || undefined
      });
      
      setCotwResult(`✅ Success! Posted COTW: "${response.data.oc.name}"\nMessage ID: ${response.data.messageId}`);
    } catch (error: any) {
      setCotwResult(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setCotwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>🔧 Admin Panel</h1>
        <p className="page-instructions">
          <i className="fas fa-info-circle"></i> Test posting QOTD, COTW, and prompts to Discord. Leave fields empty to use random/default values.
        </p>
      </div>

      <div className="admin-sections">
        {/* QOTD Testing */}
        <div className="admin-section">
          <h2><i className="fas fa-question-circle"></i> Test QOTD Posting</h2>
          <div className="admin-form">
            <div className="form-group">
              <label>Category (optional)</label>
              <select value={qotdCategory} onChange={(e) => setQotdCategory(e.target.value)}>
                <option value="">Random</option>
                <option value="OC General">OC General</option>
                <option value="Worldbuilding">Worldbuilding</option>
                <option value="Yume">Yume</option>
                <option value="Misc">Misc</option>
              </select>
            </div>
            <div className="form-group">
              <label>Channel ID (optional - uses configured channel if empty)</label>
              <input
                type="text"
                value={qotdChannelId}
                onChange={(e) => setQotdChannelId(e.target.value)}
                placeholder="Leave empty to use configured QOTD channel"
              />
            </div>
            <div className="form-group">
              <label>QOTD ID (optional - uses random if empty)</label>
              <input
                type="text"
                value={qotdId}
                onChange={(e) => setQotdId(e.target.value)}
                placeholder="Leave empty for random QOTD"
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleTestQOTD}
              disabled={qotdLoading}
            >
              {qotdLoading ? 'Posting...' : 'Post QOTD'}
            </button>
            {qotdResult && (
              <div className={`result-box ${qotdResult.startsWith('✅') ? 'success' : 'error'}`}>
                <pre>{qotdResult}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Testing */}
        <div className="admin-section">
          <h2><i className="fas fa-lightbulb"></i> Test Prompt Posting</h2>
          <div className="admin-form">
            <div className="form-group">
              <label>Category (optional)</label>
              <select value={promptCategory} onChange={(e) => setPromptCategory(e.target.value)}>
                <option value="">Random</option>
                <option value="General">General</option>
                <option value="RP">RP</option>
                <option value="Worldbuilding">Worldbuilding</option>
                <option value="Misc">Misc</option>
              </select>
            </div>
            <div className="form-group">
              <label>Channel ID (optional - uses configured channel if empty)</label>
              <input
                type="text"
                value={promptChannelId}
                onChange={(e) => setPromptChannelId(e.target.value)}
                placeholder="Leave empty to use configured prompt channel"
              />
            </div>
            <div className="form-group">
              <label>Prompt ID (optional - uses random if empty)</label>
              <input
                type="text"
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
                placeholder="Leave empty for random prompt"
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleTestPrompt}
              disabled={promptLoading}
            >
              {promptLoading ? 'Posting...' : 'Post Prompt'}
            </button>
            {promptResult && (
              <div className={`result-box ${promptResult.startsWith('✅') ? 'success' : 'error'}`}>
                <pre>{promptResult}</pre>
              </div>
            )}
          </div>
        </div>

        {/* COTW Testing */}
        <div className="admin-section">
          <h2><i className="fas fa-crown"></i> Test COTW Posting</h2>
          <div className="admin-form">
            <div className="form-group">
              <label>OC ID (optional - uses random if empty)</label>
              <input
                type="text"
                value={cotwOcId}
                onChange={(e) => setCotwOcId(e.target.value)}
                placeholder="Leave empty for random OC"
              />
            </div>
            <div className="form-group">
              <label>Channel ID (optional - uses configured channel if empty)</label>
              <input
                type="text"
                value={cotwChannelId}
                onChange={(e) => setCotwChannelId(e.target.value)}
                placeholder="Leave empty to use configured COTW channel"
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleTestCOTW}
              disabled={cotwLoading}
            >
              {cotwLoading ? 'Posting...' : 'Post COTW'}
            </button>
            {cotwResult && (
              <div className={`result-box ${cotwResult.startsWith('✅') ? 'success' : 'error'}`}>
                <pre>{cotwResult}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

