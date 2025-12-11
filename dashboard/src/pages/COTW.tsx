import { useState, useEffect, useCallback } from 'react';
import { GUILD_ID } from '../constants';
import { getCurrentCOTW, getCOTWHistory, getUsers } from '../services/api';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import DataTable from '../components/DataTable';
import './COTW.css';

interface COTWEntry {
  _id: string;
  guildId: string;
  ocId: any;
  channelId: string;
  date: string;
}

export default function COTW() {
  const [currentCOTW, setCurrentCOTW] = useState<COTWEntry | null>(null);
  const [history, setHistory] = useState<COTWEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Map<string, { username: string; globalName?: string }>>(new Map());

  useEffect(() => {
    fetchCOTW();
  }, []);

  const fetchCOTW = async () => {
    try {
      setLoading(true);
      setError(null);
      const [currentResponse, historyResponse] = await Promise.all([
        getCurrentCOTW(GUILD_ID),
        getCOTWHistory(GUILD_ID, 20)
      ]);
      setCurrentCOTW(currentResponse.data);
      setHistory(historyResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch COTW');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserNames = useCallback(async () => {
    try {
      const ownerIds: string[] = [];
      
      // Get owner ID from current COTW
      if (currentCOTW?.ocId?.ownerId) {
        ownerIds.push(currentCOTW.ocId.ownerId);
      }
      
      // Get owner IDs from history
      history.forEach(entry => {
        if (entry.ocId?.ownerId && !ownerIds.includes(entry.ocId.ownerId)) {
          ownerIds.push(entry.ocId.ownerId);
        }
      });
      
      if (ownerIds.length === 0) return;

      const response = await getUsers(ownerIds, GUILD_ID);
      const users = response.data;
      const newUserMap = new Map<string, { username: string; globalName?: string }>();
      
      users.forEach((user: any) => {
        newUserMap.set(user.id, {
          username: user.username,
          globalName: user.globalName
        });
      });
      
      setUserMap(newUserMap);
    } catch (err: any) {
      console.error('Failed to fetch user names:', err);
      // Don't show error to user, just log it
    }
  }, [currentCOTW, history]);

  useEffect(() => {
    if (currentCOTW || history.length > 0) {
      fetchUserNames();
    }
  }, [currentCOTW, history, fetchUserNames]);

  const columns = [
    {
      key: 'ocId',
      label: 'OC',
      render: (entry: COTWEntry) => (
        <div className="cotw-history-oc">
          {entry.ocId ? (
            <>
              {entry.ocId.imageUrl && (
                <img 
                  src={entry.ocId.imageUrl} 
                  alt={entry.ocId.name}
                  className="cotw-history-oc-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="cotw-history-oc-info">
                <strong>{entry.ocId.name}</strong>
                <div className="cotw-history-oc-meta">
                  <span><i className="fas fa-theater-masks"></i> {entry.ocId.fandom}</span>
                  {entry.ocId.ownerId && (
                    <span>
                      <i className="fas fa-user"></i>{' '}
                      {userMap.get(entry.ocId.ownerId)?.globalName || 
                       userMap.get(entry.ocId.ownerId)?.username || 
                       entry.ocId.ownerId}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--color-text-light)' }}>OC not found</span>
          )}
        </div>
      )
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (entry: COTWEntry) => new Date(entry.date).toLocaleDateString()
    }
  ];

  if (loading) {
    return (
      <div className="cotw-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="cotw-page">
      <div className="cotw-header">
        <h1>Character of the Week</h1>
      </div>

      {error && (
        <div className="cotw-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>View the current Character of the Week (COTW) and browse the history of past winners. COTW can be scheduled automatically in the <strong>Settings</strong> page.</span>
      </p>

      {currentCOTW ? (
        <div className="cotw-current">
          <div className="cotw-current-card">
            <div className="cotw-current-header">
              <h2>
                <i className="fas fa-crown"></i> Current Character of the Week
              </h2>
              <span className="cotw-date">
                Selected on {new Date(currentCOTW.date).toLocaleDateString()}
              </span>
            </div>
            {currentCOTW.ocId ? (
              <div className="cotw-oc-details">
                <div className="cotw-oc-main">
                  <div className="cotw-oc-image">
                    {currentCOTW.ocId.imageUrl ? (
                      <img
                        src={currentCOTW.ocId.imageUrl}
                        alt={currentCOTW.ocId.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="cotw-oc-image-placeholder">
                        <i className="fas fa-star"></i>
                      </div>
                    )}
                  </div>
                  <div className="cotw-oc-content">
                    <h3>{currentCOTW.ocId.name}</h3>
                    <div className="cotw-oc-owner">
                      <i className="fas fa-user"></i>
                      <span className="cotw-oc-owner-name">
                        {userMap.get(currentCOTW.ocId.ownerId)?.globalName || 
                         userMap.get(currentCOTW.ocId.ownerId)?.username || 
                         currentCOTW.ocId.ownerId}
                      </span>
                    </div>
                    <div className="cotw-oc-fandom">
                      <i className="fas fa-theater-masks"></i>
                      {currentCOTW.ocId.fandom}
                    </div>
                  </div>
                </div>
                <div className="cotw-oc-info">
                  {currentCOTW.ocId.age && (
                    <div className="cotw-oc-item">
                      <i className="fas fa-birthday-cake"></i>
                      <div>
                        <strong>Age:</strong> {currentCOTW.ocId.age}
                      </div>
                    </div>
                  )}
                  {currentCOTW.ocId.gender && (
                    <div className="cotw-oc-item">
                      <i className="fas fa-venus-mars"></i>
                      <div>
                        <strong>Gender:</strong> {currentCOTW.ocId.gender}
                      </div>
                    </div>
                  )}
                  {currentCOTW.ocId.race && (
                    <div className="cotw-oc-item">
                      <i className="fas fa-dna"></i>
                      <div>
                        <strong>Race/Species:</strong> {currentCOTW.ocId.race}
                      </div>
                    </div>
                  )}
                  {currentCOTW.ocId.birthday && (
                    <div className="cotw-oc-item">
                      <i className="fas fa-calendar"></i>
                      <div>
                        <strong>Birthday:</strong> {currentCOTW.ocId.birthday}
                      </div>
                    </div>
                  )}
                  {currentCOTW.ocId.bioLink && (
                    <div className="cotw-oc-item cotw-oc-item-full">
                      <i className="fas fa-link"></i>
                      <div>
                        <strong>Bio Link:</strong>{' '}
                        <a href={currentCOTW.ocId.bioLink} target="_blank" rel="noopener noreferrer" className="cotw-oc-link">
                          {currentCOTW.ocId.bioLink}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-light)' }}>OC not found</p>
            )}
          </div>
        </div>
      ) : (
        <div className="cotw-no-current">
          <EmptyState
            icon="fa-crown"
            title="No Character of the Week"
            message="No Character of the Week has been selected yet this week."
          />
        </div>
      )}

      <div className="cotw-history">
        <h2>History</h2>
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 'var(--spacing-2xl)' }}>
            No COTW history found.
          </p>
        ) : (
          <DataTable
            data={history}
            columns={columns}
            keyExtractor={(entry) => entry._id}
            searchable={false}
          />
        )}
      </div>
    </div>
  );
}
