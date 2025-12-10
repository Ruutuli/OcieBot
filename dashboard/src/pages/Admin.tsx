import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUILD_ID } from '../constants';
import api, { getChannels, getOCs, getQOTDs, getPrompts, getAdmins, addAdmin, removeAdmin, rerollQOTD, rerollPrompt, rerollCOTWAdmin, checkAdmin } from '../services/api';
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

  // Admin management
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminUserId, setNewAdminUserId] = useState<string>('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string>('');

  // Reroll states
  const [rerollQotdCategory, setRerollQotdCategory] = useState<string>('');
  const [rerollQotdLoading, setRerollQotdLoading] = useState(false);
  const [rerollQotdResult, setRerollQotdResult] = useState<string>('');
  const [rerollPromptCategory, setRerollPromptCategory] = useState<string>('');
  const [rerollPromptLoading, setRerollPromptLoading] = useState(false);
  const [rerollPromptResult, setRerollPromptResult] = useState<string>('');
  const [rerollCotwLoading, setRerollCotwLoading] = useState(false);
  const [rerollCotwResult, setRerollCotwResult] = useState<string>('');

  useEffect(() => {
    checkAuth();
    fetchData();
    fetchAdmins();
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
      // Check admin status from API
      const adminRes = await checkAdmin();
      if (adminRes.data.isAdmin) {
        setAuthorized(true);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
      // Fallback to original admin check
      try {
        const res = await api.get('/auth/me');
        const userData = res.data.user;
        if (userData.id === ADMIN_USER_ID) {
          setAuthorized(true);
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        navigate('/');
      }
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
      
      const qotd = response.data.qotd;
      const questionPreview = qotd.question.length > 100 
        ? qotd.question.substring(0, 100) + '...' 
        : qotd.question;
      setQotdResult(`✅ Success! Posted QOTD: "${questionPreview}"\n\nQOTD ID: ${qotd._id}\nMessage ID: ${response.data.messageId}`);
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

  const fetchAdmins = async () => {
    try {
      setAdminsLoading(true);
      const response = await getAdmins();
      setAdmins(response.data);
    } catch (error: any) {
      console.error('Failed to fetch admins:', error);
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminUserId.trim()) {
      setAdminError('User ID is required');
      return;
    }

    try {
      setAddingAdmin(true);
      setAdminError('');
      await addAdmin(newAdminUserId.trim());
      setNewAdminUserId('');
      await fetchAdmins();
    } catch (error: any) {
      setAdminError(error.response?.data?.error || 'Failed to add admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this admin?')) {
      return;
    }

    try {
      await removeAdmin(userId);
      await fetchAdmins();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove admin');
    }
  };

  const handleRerollQOTD = async () => {
    setRerollQotdLoading(true);
    setRerollQotdResult('');
    
    try {
      const response = await rerollQOTD(GUILD_ID, rerollQotdCategory || undefined);
      const qotd = response.data.qotd;
      const questionPreview = qotd.question.length > 100 
        ? qotd.question.substring(0, 100) + '...' 
        : qotd.question;
      setRerollQotdResult(`✅ Success! Rerolled QOTD: "${questionPreview}"\n\nQOTD ID: ${qotd._id}\nMessage ID: ${response.data.messageId}`);
    } catch (error: any) {
      setRerollQotdResult(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setRerollQotdLoading(false);
    }
  };

  const handleRerollPrompt = async () => {
    setRerollPromptLoading(true);
    setRerollPromptResult('');
    
    try {
      const response = await rerollPrompt(GUILD_ID, rerollPromptCategory || undefined);
      setRerollPromptResult(`✅ Success! Rerolled Prompt: "${response.data.prompt.text}"\nMessage ID: ${response.data.messageId}`);
    } catch (error: any) {
      setRerollPromptResult(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setRerollPromptLoading(false);
    }
  };

  const handleRerollCOTW = async () => {
    setRerollCotwLoading(true);
    setRerollCotwResult('');
    
    try {
      const response = await rerollCOTWAdmin(GUILD_ID);
      setRerollCotwResult(`✅ Success! Rerolled COTW: "${response.data.oc.name}"\nMessage ID: ${response.data.messageId}`);
    } catch (error: any) {
      setRerollCotwResult(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setRerollCotwLoading(false);
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
          <i className="fas fa-info-circle"></i>
          <span>Test posting QOTD, COTW, prompts, and birthdays to Discord. Leave fields empty to use random/default values (except OC ID for birthday).</span>
        </p>
      </div>

      <div className="admin-sections">
        {/* Admin Management */}
        <div className="admin-section">
          <h2><i className="fas fa-users-cog"></i> Admin Management</h2>
          <div className="admin-form">
            <div className="form-group">
              <label>Add Admin (Discord User ID)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={newAdminUserId}
                  onChange={(e) => setNewAdminUserId(e.target.value)}
                  placeholder="Enter Discord User ID"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn-primary"
                  onClick={handleAddAdmin}
                  disabled={addingAdmin || !newAdminUserId.trim()}
                >
                  {addingAdmin ? 'Adding...' : 'Add Admin'}
                </button>
              </div>
              {adminError && (
                <div className="error-message" style={{ marginTop: '10px', color: '#FFA8A8' }}>
                  {adminError}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Current Admins</label>
              {adminsLoading ? (
                <p>Loading admins...</p>
              ) : admins.length === 0 ? (
                <p>No admins found</p>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  {admins.map((admin) => (
                    <div
                      key={admin._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px',
                        marginBottom: '5px',
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--border-radius-sm)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--color-text-primary)' }}>
                          {admin.username || admin.globalName || 'Unknown User'}
                        </strong>
                        <br />
                        <small style={{ color: 'var(--color-text-light)' }}>ID: {admin.userId}</small>
                      </div>
                      {admin.userId !== ADMIN_USER_ID && (
                        <button
                          className="btn-secondary"
                          onClick={() => handleRemoveAdmin(admin.userId)}
                          style={{ padding: '5px 10px' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reroll Functions */}
        <div className="admin-section">
          <h2><i className="fas fa-redo"></i> Reroll Functions</h2>
          <div className="admin-form">
            <div className="form-group">
              <label>Reroll QOTD</label>
              <select
                value={rerollQotdCategory}
                onChange={(e) => setRerollQotdCategory(e.target.value)}
                style={{ marginBottom: '10px' }}
              >
                <option value="">All Categories</option>
                <option value="OC General">OC General</option>
                <option value="Worldbuilding">Worldbuilding</option>
                <option value="Yume">Yume</option>
                <option value="Misc">Misc</option>
              </select>
              <button
                className="btn-primary"
                onClick={handleRerollQOTD}
                disabled={rerollQotdLoading}
              >
                {rerollQotdLoading ? 'Rerolling...' : 'Reroll QOTD'}
              </button>
              {rerollQotdResult && (
                <div className={`result-box ${rerollQotdResult.startsWith('✅') ? 'success' : 'error'}`} style={{ marginTop: '10px' }}>
                  <pre>{rerollQotdResult}</pre>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Reroll Prompt</label>
              <select
                value={rerollPromptCategory}
                onChange={(e) => setRerollPromptCategory(e.target.value)}
                style={{ marginBottom: '10px' }}
              >
                <option value="">All Categories</option>
                <option value="General">General</option>
                <option value="RP">RP</option>
                <option value="Worldbuilding">Worldbuilding</option>
                <option value="Misc">Misc</option>
              </select>
              <button
                className="btn-primary"
                onClick={handleRerollPrompt}
                disabled={rerollPromptLoading}
              >
                {rerollPromptLoading ? 'Rerolling...' : 'Reroll Prompt'}
              </button>
              {rerollPromptResult && (
                <div className={`result-box ${rerollPromptResult.startsWith('✅') ? 'success' : 'error'}`} style={{ marginTop: '10px' }}>
                  <pre>{rerollPromptResult}</pre>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Reroll COTW</label>
              <button
                className="btn-primary"
                onClick={handleRerollCOTW}
                disabled={rerollCotwLoading}
              >
                {rerollCotwLoading ? 'Rerolling...' : 'Reroll COTW'}
              </button>
              {rerollCotwResult && (
                <div className={`result-box ${rerollCotwResult.startsWith('✅') ? 'success' : 'error'}`} style={{ marginTop: '10px' }}>
                  <pre>{rerollCotwResult}</pre>
                </div>
              )}
            </div>
          </div>
        </div>

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

