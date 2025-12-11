import { useState, useEffect } from 'react';
import { getFandoms, getOCs } from '../services/api';
import { GUILD_ID } from '../constants';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './FandomDirectory.css';

interface Fandom {
  fandom: string;
  ocCount: number;
  userCount: number;
}

interface OC {
  _id: string;
  name: string;
  ownerId: string;
  fandoms: string[];
}

export default function FandomDirectory() {
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [selectedFandom, setSelectedFandom] = useState<Fandom | null>(null);
  const [fandomOCs, setFandomOCs] = useState<OC[]>([]);

  useEffect(() => {
    fetchFandoms();
  }, []);

  const fetchFandoms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFandoms(GUILD_ID);
      setFandoms(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch fandoms');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (fandom: Fandom) => {
    setSelectedFandom(fandom);
    try {
      const response = await getOCs(GUILD_ID);
      const ocs = response.data.filter((oc: OC) => {
        const fandoms = oc.fandoms || [];
        return fandoms.some(f => f.toLowerCase() === fandom.fandom.toLowerCase());
      });
      setFandomOCs(ocs);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch OCs');
    }
  };

  const sortedFandoms = [...fandoms].sort((a, b) => b.ocCount - a.ocCount);

  if (loading) {
    return (
      <div className="fandom-directory-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="fandom-directory-page">
      <div className="fandom-directory-header">
        <h1>Fandom Directory</h1>
      </div>

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>View all fandoms that your OCs belong to. Fandoms are automatically created when you add OCs with fandom names. Click <strong>View Details</strong> on any fandom card to see all OCs in that fandom.</span>
      </p>

      {error && (
        <div className="fandom-directory-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {fandoms.length === 0 ? (
        <EmptyState
          icon="fa-theater-masks"
          title="No Fandoms Found"
          message="Fandoms will appear here once OCs are created."
        />
      ) : (
        <div className="fandom-grid">
          {sortedFandoms.map((fandom) => (
            <div key={fandom.fandom} className="fandom-card">
              <div className="fandom-card-header">
                <h3>{fandom.fandom}</h3>
              </div>
              <div className="fandom-card-stats">
                <div className="fandom-stat">
                  <i className="fas fa-star"></i>
                  <span>{fandom.ocCount} OC{fandom.ocCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="fandom-stat">
                  <i className="fas fa-users"></i>
                  <span>{fandom.userCount} User{fandom.userCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="fandom-card-actions">
                <button className="btn-secondary" onClick={() => handleViewDetails(fandom)}>
                  <i className="fas fa-eye"></i> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fandom Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedFandom ? `${selectedFandom.fandom} - OCs` : 'Fandom Details'}
        size="lg"
        footer={
          <button className="btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
            Close
          </button>
        }
      >
        {fandomOCs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>
            No OCs found in this fandom.
          </p>
        ) : (
          <div className="fandom-ocs-list">
            {fandomOCs.map((oc) => (
              <div key={oc._id} className="fandom-oc-item">
                <strong>{oc.name}</strong>
                <span className="fandom-oc-owner">Owner ID: {oc.ownerId}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
