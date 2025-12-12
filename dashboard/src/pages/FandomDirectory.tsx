import { useState, useEffect, useCallback } from 'react';
import { getFandoms, getOCs, getOC, getUsers, updateFandom, createFandom, checkAdmin } from '../services/api';
import { GUILD_ID } from '../constants';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { OCDetails, OC as FullOC } from './OCManager';
import { normalizeImageUrl, supportsCORS } from '../utils/imageUtils';
import './FandomDirectory.css';
import './OCManager.css';

interface Fandom {
  fandom: string;
  ocCount: number;
  userCount: number;
  imageUrl?: string;
  color?: string;
}

interface OC {
  _id: string;
  name: string;
  ownerId: string;
  fandoms: string[];
  imageUrl?: string;
}

export default function FandomDirectory() {
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isOCDetailsModalOpen, setIsOCDetailsModalOpen] = useState(false);
  
  const [selectedFandom, setSelectedFandom] = useState<Fandom | null>(null);
  const [newFandomName, setNewFandomName] = useState('');
  const [newFandomImageUrl, setNewFandomImageUrl] = useState('');
  const [newFandomColor, setNewFandomColor] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [fandomOCs, setFandomOCs] = useState<OC[]>([]);
  const [selectedOC, setSelectedOC] = useState<FullOC | null>(null);
  const [ocDetailsLoading, setOcDetailsLoading] = useState(false);
  const [userMap, setUserMap] = useState<Map<string, { username: string; globalName?: string }>>(new Map());
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchFandoms();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await checkAdmin();
      setIsAdmin(response.data.isAdmin || false);
    } catch (err: any) {
      setIsAdmin(false);
    }
  };

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

  const fetchUserNames = useCallback(async () => {
    try {
      const uniqueOwnerIds = [...new Set(fandomOCs.map(oc => oc.ownerId))];
      if (uniqueOwnerIds.length === 0) return;

      const response = await getUsers(uniqueOwnerIds, GUILD_ID);
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
  }, [fandomOCs]);

  useEffect(() => {
    if (fandomOCs.length > 0) {
      fetchUserNames();
    }
  }, [fandomOCs, fetchUserNames]);

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

  const handleEditFandom = (fandom: Fandom) => {
    setSelectedFandom(fandom);
    // Preserve the full URL including /revision/latest if present
    setEditImageUrl(fandom.imageUrl || '');
    setEditColor(fandom.color || '');
    setIsEditModalOpen(true);
  };

  const handleCreateFandom = async () => {
    if (!newFandomName.trim()) return;

    try {
      setCreateLoading(true);
      setError(null);
      // Validate color format if provided
      if (newFandomColor && !/^#[0-9A-F]{6}$/i.test(newFandomColor)) {
        setError('Color must be a valid hex color code (e.g., #FF5733)');
        return;
      }
      await createFandom(GUILD_ID, newFandomName.trim(), newFandomImageUrl || undefined, newFandomColor || undefined);
      await fetchFandoms(); // Refresh the list
      setIsCreateModalOpen(false);
      setNewFandomName('');
      setNewFandomImageUrl('');
      setNewFandomColor('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create fandom');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveFandom = async () => {
    if (!selectedFandom) return;

    try {
      setEditLoading(true);
      setError(null);
      // Validate color format if provided
      if (editColor && !/^#[0-9A-F]{6}$/i.test(editColor)) {
        setError('Color must be a valid hex color code (e.g., #FF5733)');
        return;
      }
      await updateFandom(selectedFandom.fandom, GUILD_ID, editImageUrl || undefined, editColor || undefined);
      await fetchFandoms(); // Refresh the list
      setIsEditModalOpen(false);
      setSelectedFandom(null);
      setEditImageUrl('');
      setEditColor('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update fandom');
    } finally {
      setEditLoading(false);
    }
  };

  const handleViewOC = async (oc: OC) => {
    try {
      setOcDetailsLoading(true);
      setError(null);
      const response = await getOC(oc._id);
      setSelectedOC(response.data);
      setIsOCDetailsModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch OC details');
    } finally {
      setOcDetailsLoading(false);
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
        {isAdmin && (
          <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <i className="fas fa-plus"></i> Create Fandom
          </button>
        )}
      </div>

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>View all fandoms that your OCs belong to. Fandoms are automatically created when you add OCs with fandom names{isAdmin && ', or you can create them manually using the Create Fandom button'}. Click <strong>View Details</strong> on any fandom card to see all OCs in that fandom.</span>
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
          {sortedFandoms.map((fandom) => {
            const normalizedImageUrl = normalizeImageUrl(fandom.imageUrl);
            return (
            <div key={fandom.fandom} className="fandom-card">
              {normalizedImageUrl && (
                <div className="fandom-card-image">
                  <img 
                    src={normalizedImageUrl} 
                    alt={fandom.fandom}
                    {...(supportsCORS(normalizedImageUrl) ? { crossOrigin: 'anonymous' } : {})}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="fandom-card-header">
                <h3 style={fandom.color ? { color: fandom.color } : undefined}>{fandom.fandom}</h3>
                {isAdmin && (
                  <button 
                    className="btn-icon" 
                    onClick={() => handleEditFandom(fandom)}
                    title="Edit Fandom"
                    aria-label="Edit Fandom"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                )}
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
            );
          })}
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
            {fandomOCs.map((oc) => {
              const normalizedOcImageUrl = normalizeImageUrl(oc.imageUrl);
              return (
              <div 
                key={oc._id} 
                className="fandom-oc-item"
                onClick={() => handleViewOC(oc)}
                style={{ cursor: 'pointer' }}
              >
                <div className="fandom-oc-item-content">
                  <div className="fandom-oc-icon">
                    {normalizedOcImageUrl ? (
                      <img 
                        src={normalizedOcImageUrl} 
                        alt={oc.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<i class="fas fa-user-circle"></i>';
                          }
                        }}
                      />
                    ) : (
                      <i className="fas fa-user-circle"></i>
                    )}
                  </div>
                  <div className="fandom-oc-info">
                    <strong className="fandom-oc-name">{oc.name}</strong>
                    <span className="fandom-oc-owner">
                      <i className="fas fa-user"></i>
                      {userMap.get(oc.ownerId)?.globalName || userMap.get(oc.ownerId)?.username || oc.ownerId}
                    </span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* OC Details Modal */}
      <Modal
        isOpen={isOCDetailsModalOpen}
        onClose={() => {
          setIsOCDetailsModalOpen(false);
          setSelectedOC(null);
        }}
        title={selectedOC ? selectedOC.name : 'OC Details'}
        size="xl"
        footer={
          <button className="btn-secondary" onClick={() => {
            setIsOCDetailsModalOpen(false);
            setSelectedOC(null);
          }}>
            Close
          </button>
        }
      >
        {ocDetailsLoading ? (
          <LoadingSpinner size="md" />
        ) : selectedOC ? (
          <OCDetails oc={selectedOC} />
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>
            No OC data available.
          </p>
        )}
      </Modal>

      {/* Create Fandom Modal */}
      {isAdmin && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setNewFandomName('');
            setNewFandomImageUrl('');
            setNewFandomColor('');
            setError(null);
          }}
          title="Create New Fandom"
          size="md"
          footer={
            <>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewFandomName('');
                  setNewFandomImageUrl('');
                  setNewFandomColor('');
                  setError(null);
                }}
                disabled={createLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleCreateFandom}
                disabled={createLoading}
              >
                {createLoading ? 'Creating...' : 'Create'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <FormField
              label="Fandom Name"
              name="fandomName"
              type="text"
              value={newFandomName}
              onChange={setNewFandomName}
              placeholder="Enter fandom name"
              required
            />
            <FormField
              label="Logo Image URL"
              name="imageUrl"
              type="text"
              value={newFandomImageUrl}
              onChange={setNewFandomImageUrl}
              placeholder="https://example.com/logo.png"
            />
            <FormField
              label="Color (Hex Code)"
              name="color"
              type="text"
              value={newFandomColor}
              onChange={setNewFandomColor}
              placeholder="#FF5733"
            />
            {newFandomColor && !/^#[0-9A-F]{6}$/i.test(newFandomColor) && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-error)', marginTop: '-1rem' }}>
                Invalid color format. Use hex format like #FF5733
              </p>
            )}
            {newFandomImageUrl && (
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                  Preview:
                </label>
                <img 
                  src={normalizeImageUrl(newFandomImageUrl) || newFandomImageUrl} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-border)'
                  }}
                  {...(supportsCORS(newFandomImageUrl) ? { crossOrigin: 'anonymous' } : {})}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Fandom Modal */}
      {isAdmin && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedFandom(null);
            setEditImageUrl('');
            setEditColor('');
          }}
          title={selectedFandom ? `Edit ${selectedFandom.fandom}` : 'Edit Fandom'}
          size="md"
          footer={
            <>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedFandom(null);
                  setEditImageUrl('');
                  setEditColor('');
                }}
                disabled={editLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSaveFandom}
                disabled={editLoading}
              >
                {editLoading ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <FormField
              label="Logo Image URL"
              name="imageUrl"
              type="text"
              value={editImageUrl}
              onChange={setEditImageUrl}
              placeholder="https://example.com/logo.png"
            />
            <FormField
              label="Color (Hex Code)"
              name="color"
              type="text"
              value={editColor}
              onChange={setEditColor}
              placeholder="#FF5733"
            />
            {editColor && !/^#[0-9A-F]{6}$/i.test(editColor) && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-error)', marginTop: '-1rem' }}>
                Invalid color format. Use hex format like #FF5733
              </p>
            )}
            {editImageUrl && (
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                  Preview:
                </label>
                <img 
                  src={normalizeImageUrl(editImageUrl) || editImageUrl} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-border)'
                  }}
                  {...(supportsCORS(editImageUrl) ? { crossOrigin: 'anonymous' } : {})}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
