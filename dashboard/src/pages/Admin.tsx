import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUILD_ID } from '../constants';
import api, { getChannels, getOCs, getQOTDs, getPrompts } from '../services/api';
import './Admin.css';

const ADMIN_USER_ID = '211219306137124865';

interface Channel {
  id: string;
  name: string;
  type: number;
}

interface OC {
  _id: string;
  name: string;
  fandom?: string;
  birthday?: string;
}

interface QOTD {
  _id: string;
  question: string;
  category: string;
  fandom?: string;
}

interface Prompt {
  _id: string;
  text: string;
  category: string;
  fandom?: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Data for dropdowns
  const [channels, setChannels] = useState<Channel[]>([]);
  const [ocs, setOCs] = useState<OC[]>([]);
  const [qotds, setQOTDs] = useState<QOTD[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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

  const [birthdayOcId, setBirthdayOcId] = useState<string>('');
  const [birthdayChannelId, setBirthdayChannelId] = useState<string>('');
  const [birthdayLoading, setBirthdayLoading] = useState(false);
  const [birthdayResult, setBirthdayResult] = useState<string>('');

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      const [channelsRes, ocsRes, qotdsRes, promptsRes] = await Promise.all([
        getChannels(GUILD_ID).catch(() => ({ data: [] })),
        getOCs(GUILD_ID).catch(() => ({ data: [] })),
        getQOTDs(GUILD_ID).catch(() => ({ data: [] })),
        getPrompts(GUILD_ID).catch(() => ({ data: [] }))
      ]);
      
      setChannels(channelsRes.data || []);
      setOCs(ocsRes.data || []);
      setQOTDs(qotdsRes.data || []);
      setPrompts(promptsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setDataLoading(false);
    }
  };

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

  const handleTestBirthday = async () => {
    setBirthdayLoading(true);
    setBirthdayResult('');
    
    try {
      if (!birthdayOcId) {
        setBirthdayResult('❌ Error: OC ID is required for birthday posting');
        setBirthdayLoading(false);
        return;
      }

      const response = await api.post('/admin/test/birthday', {
        guildId: GUILD_ID,
        ocId: birthdayOcId,
        channelId: birthdayChannelId || undefined
      });
      
      setBirthdayResult(`✅ Success! Posted Birthday: "${response.data.oc.name}" (${response.data.oc.birthday})\nMessage ID: ${response.data.messageId}`);
    } catch (error: any) {
      setBirthdayResult(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setBirthdayLoading(false);
    }
  };

  if (loading || dataLoading) {
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
          <i className="fas fa-info-circle"></i> Test posting QOTD, COTW, prompts, and birthdays to Discord. Leave fields empty to use random/default values (except OC ID for birthday).
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
              <label>Channel (optional - uses configured channel if empty)</label>
              <select
                value={qotdChannelId}
                onChange={(e) => setQotdChannelId(e.target.value)}
                disabled={dataLoading}
              >
                <option value="">Use configured QOTD channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>QOTD (optional - uses random if empty)</label>
              <select
                value={qotdId}
                onChange={(e) => setQotdId(e.target.value)}
                disabled={dataLoading}
              >
                <option value="">Random QOTD</option>
                {qotds
                  .filter((q) => !qotdCategory || q.category === qotdCategory)
                  .map((qotd) => {
                    const preview = qotd.question.length > 60 
                      ? qotd.question.substring(0, 60) + '...' 
                      : qotd.question;
                    return (
                      <option key={qotd._id} value={qotd._id}>
                        [{qotd.category}] {preview}
                      </option>
                    );
                  })}
              </select>
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
              <label>Channel (optional - uses configured channel if empty)</label>
              <select
                value={promptChannelId}
                onChange={(e) => setPromptChannelId(e.target.value)}
                disabled={dataLoading}
              >
                <option value="">Use configured prompt channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Prompt (optional - uses random if empty)</label>
              <select
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
                disabled={dataLoading}
              >
                <option value="">Random Prompt</option>
                {prompts
                  .filter((p) => !promptCategory || p.category === promptCategory)
                  .map((prompt) => {
                    const preview = prompt.text.length > 60 
                      ? prompt.text.substring(0, 60) + '...' 
                      : prompt.text;
                    return (
                      <option key={prompt._id} value={prompt._id}>
                        [{prompt.category}] {preview}
                      </option>
                    );
                  })}
              </select>
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
              <label>OC (optional - uses random if empty)</label>
              <select
                value={cotwOcId}
                onChange={(e) => setCotwOcId(e.target.value)}
                disabled={dataLoading}
              >
                <option value="">Random OC</option>
                {ocs.map((oc) => (
                  <option key={oc._id} value={oc._id}>
                    {oc.name} {oc.fandom ? `(${oc.fandom})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Channel (optional - uses configured channel if empty)</label>
              <select
                value={cotwChannelId}
                onChange={(e) => setCotwChannelId(e.target.value)}
                disabled={dataLoading}
              >
                <option value="">Use configured COTW channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
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

        {/* Birthday Testing */}
        <div className="admin-section">
          <h2><i className="fas fa-birthday-cake"></i> Test Birthday Posting</h2>
          <div className="admin-form">
            <div className="form-group">
              <label>OC (required)</label>
              <select
                value={birthdayOcId}
                onChange={(e) => setBirthdayOcId(e.target.value)}
                disabled={dataLoading}
                required
              >
                <option value="">Select an OC</option>
                {ocs
                  .filter((oc) => oc.birthday) // Only show OCs with birthdays
                  .map((oc) => (
                    <option key={oc._id} value={oc._id}>
                      {oc.name} {oc.fandom ? `(${oc.fandom})` : ''} - {oc.birthday}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Channel (optional - uses configured channel if empty)</label>
              <select
                value={birthdayChannelId}
                onChange={(e) => setBirthdayChannelId(e.target.value)}
                disabled={dataLoading}
              >
                <option value="">Use configured birthday channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-primary"
              onClick={handleTestBirthday}
              disabled={birthdayLoading || !birthdayOcId}
            >
              {birthdayLoading ? 'Posting...' : 'Post Birthday'}
            </button>
            {birthdayResult && (
              <div className={`result-box ${birthdayResult.startsWith('✅') ? 'success' : 'error'}`}>
                <pre>{birthdayResult}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

