import { useState, useEffect, useCallback } from 'react';
import { getOCs, getOC, getUsers } from '../services/api';
import { GUILD_ID } from '../constants';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { OCDetails, OC as FullOC } from './OCManager';
import { normalizeImageUrl } from '../utils/imageUtils';
import './Yumeships.css';

interface OC {
  _id: string;
  name: string;
  ownerId: string;
  guildId: string;
  fandoms: string[];
  imageUrl?: string;
  yume?: {
    foName?: string;
    foSource?: string;
    relationshipType?: string;
    tags?: string[];
    link?: string;
    foImageUrl?: string;
  };
}

export default function Yumeships() {
  const [ocs, setOCs] = useState<OC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userMap, setUserMap] = useState<Map<string, { username: string; globalName?: string }>>(new Map());
  
  const [isOCDetailsModalOpen, setIsOCDetailsModalOpen] = useState(false);
  const [selectedOC, setSelectedOC] = useState<FullOC | null>(null);
  const [ocDetailsLoading, setOcDetailsLoading] = useState(false);

  useEffect(() => {
    fetchOCs();
  }, []);

  const fetchOCs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOCs(GUILD_ID);
      // Filter to only OCs with yume information
      const ocsWithYume = response.data.filter((oc: OC) => oc.yume && oc.yume.foName);
      setOCs(ocsWithYume);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch yumeships');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserNames = useCallback(async () => {
    try {
      const uniqueOwnerIds = [...new Set(ocs.map(oc => oc.ownerId))];
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
    }
  }, [ocs]);

  useEffect(() => {
    if (ocs.length > 0) {
      fetchUserNames();
    }
  }, [ocs, fetchUserNames]);

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

  const filteredOCs = ocs.filter(oc => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      oc.name.toLowerCase().includes(search) ||
      oc.yume?.foName?.toLowerCase().includes(search) ||
      oc.yume?.foSource?.toLowerCase().includes(search) ||
      oc.yume?.relationshipType?.toLowerCase().includes(search) ||
      oc.fandoms.some(f => f.toLowerCase().includes(search)) ||
      oc.yume?.tags?.some(t => t.toLowerCase().includes(search)) ||
      userMap.get(oc.ownerId)?.username?.toLowerCase().includes(search) ||
      userMap.get(oc.ownerId)?.globalName?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="yumeships-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="yumeships-page">
      <div className="yumeships-header">
        <h1>Yumeships</h1>
      </div>

      <p className="page-instructions">
        <i className="fas fa-heart"></i>
        <span>View all OCs with yumeship information. Yumeships are relationships between your OCs and fictional characters (F/Os).</span>
      </p>

      {error && (
        <div className="yumeships-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {ocs.length === 0 ? (
        <EmptyState
          icon="fa-heart"
          title="No Yumeships Found"
          message="Yumeships will appear here once OCs with yume information are created."
        />
      ) : (
        <>
          <div className="yumeships-search">
            <input
              type="text"
              placeholder="Search by OC name, F/O name, source, relationship type, tags, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="yumeships-search-input"
            />
            <i className="fas fa-search yumeships-search-icon"></i>
          </div>
          {filteredOCs.length === 0 ? (
            <div className="yumeships-empty-search">
              <p>No yumeships found matching your search.</p>
            </div>
          ) : (
            <div className="yumeships-grid">
              {filteredOCs.map((oc) => {
                const normalizedOcImageUrl = normalizeImageUrl(oc.imageUrl);
                const normalizedFoImageUrl = normalizeImageUrl(oc.yume?.foImageUrl);
                return (
                  <div
                    key={oc._id}
                    className="yumeship-card"
                    onClick={() => handleViewOC(oc)}
                  >
                    <div className="yumeship-card-header">
                      <div className="yumeship-pair">
                        <div className="yumeship-character">
                          <div className="yumeship-image-wrapper">
                            {normalizedOcImageUrl ? (
                              <img
                                src={normalizedOcImageUrl}
                                alt={oc.name}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="yumeship-image-placeholder">
                                <i className="fas fa-star"></i>
                              </div>
                            )}
                          </div>
                          <div className="yumeship-character-name">{oc.name}</div>
                          <div className="yumeship-character-label">OC</div>
                        </div>
                        <div className="yumeship-heart-connector">
                          <i className="fas fa-heart"></i>
                        </div>
                        <div className="yumeship-character">
                          <div className="yumeship-image-wrapper">
                            {normalizedFoImageUrl ? (
                              <img
                                src={normalizedFoImageUrl}
                                alt={oc.yume?.foName || 'F/O'}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="yumeship-image-placeholder">
                                <i className="fas fa-user"></i>
                              </div>
                            )}
                          </div>
                          <div className="yumeship-character-name">{oc.yume?.foName || 'Unknown'}</div>
                          <div className="yumeship-character-label">F/O</div>
                        </div>
                      </div>
                    </div>
                    <div className="yumeship-card-body">
                      {oc.fandoms && oc.fandoms.length > 0 && (
                        <div className="yumeship-fandom">
                          <i className="fas fa-theater-masks"></i>
                          <span>{oc.fandoms.join(', ')}</span>
                        </div>
                      )}
                      {oc.yume?.relationshipType && (
                        <div className="yumeship-relationship">
                          <i className="fas fa-tag"></i>
                          <span>{oc.yume.relationshipType}</span>
                        </div>
                      )}
                      {oc.yume?.foSource && (
                        <div className="yumeship-source">
                          <i className="fas fa-book"></i>
                          <span>{oc.yume.foSource}</span>
                        </div>
                      )}
                      {oc.yume?.tags && oc.yume.tags.length > 0 && (
                        <div className="yumeship-tags">
                          {oc.yume.tags.map((tag, index) => (
                            <span key={index} className="yumeship-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="yumeship-card-footer">
                      <div className="yumeship-owner">
                        <i className="fas fa-user"></i>
                        <span>{userMap.get(oc.ownerId)?.globalName || userMap.get(oc.ownerId)?.username || oc.ownerId}</span>
                      </div>
                      {oc.yume?.link && (
                        <a
                          href={oc.yume.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="yumeship-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

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
    </div>
  );
}

