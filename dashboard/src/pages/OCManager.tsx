import { useState, useEffect, useMemo, useCallback } from 'react';
import { getOCs, createOC, updateOC, deleteOC, updateOCPlaylist, addOCNote, getUsers, getFandoms } from '../services/api';
import { GUILD_ID } from '../constants';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { parsePlaylistUrl } from '../utils/playlistUtils';
import './OCManager.css';

export interface OC {
  _id: string;
  name: string;
  ownerId: string;
  guildId: string;
  fandoms: string[];
  age?: string;
  race?: string;
  gender?: string;
  birthday?: string;
  bioLink?: string;
  imageUrl?: string;
  imageAlignment?: string;
  yume?: {
    foName?: string;
    foSource?: string;
    relationshipType?: string;
    tags?: string[];
    link?: string;
    foImageUrl?: string;
  };
  playlist: string[];
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export default function OCManager() {
  const [ocs, setOCs] = useState<OC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  
  const [selectedOC, setSelectedOC] = useState<OC | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [fandomFilter, setFandomFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [fandoms, setFandoms] = useState<Array<{ fandom: string; ocCount: number; userCount: number }>>([]);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    fandoms: '',
    age: '',
    race: '',
    gender: '',
    birthday: '',
    bioLink: '',
    imageUrl: '',
    foName: '',
    foSource: '',
    relationshipType: '',
    foImageUrl: ''
  });
  
  const [playlistSong, setPlaylistSong] = useState('');
  const [newNote, setNewNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userMap, setUserMap] = useState<Map<string, { username: string; globalName?: string }>>(new Map());
  const [formImageAlignment, setFormImageAlignment] = useState<ImageAlignment>('center');

  useEffect(() => {
    fetchFandoms();
    fetchAllOwners();
  }, []);

  useEffect(() => {
    fetchOCs();
  }, [filter, fandomFilter, ownerFilter]);

  const fetchFandoms = async () => {
    try {
      const response = await getFandoms(GUILD_ID);
      setFandoms(response.data);
    } catch (err: any) {
      console.error('Failed to fetch fandoms:', err);
    }
  };

  const fetchAllOwners = async () => {
    try {
      // Fetch all OCs to get complete owners list
      const response = await getOCs(GUILD_ID);
      const allOCs = response.data;
      const uniqueOwnerIds = [...new Set(allOCs.map((oc: OC) => oc.ownerId))] as string[];
      
      if (uniqueOwnerIds.length > 0) {
        const usersResponse = await getUsers(uniqueOwnerIds, GUILD_ID);
        const users = usersResponse.data;
        const ownersList: Array<{ id: string; name: string }> = [];
        
        users.forEach((user: any) => {
          ownersList.push({
            id: user.id,
            name: user.globalName || user.username
          });
        });
        
        setOwners(ownersList.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (err: any) {
      console.error('Failed to fetch owners:', err);
    }
  };

  const fetchOCs = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (fandomFilter !== 'all') {
        // Note: OC has fandoms array, so we'll filter client-side for now
        // The API doesn't support array filtering directly
      }
      if (ownerFilter !== 'all') {
        filters.ownerId = ownerFilter;
      }
      const response = await getOCs(GUILD_ID, filters);
      let filteredOCs = response.data;
      
      // Filter by fandom client-side (since OC has fandoms array)
      if (fandomFilter !== 'all') {
        filteredOCs = filteredOCs.filter((oc: OC) => {
          return oc.fandoms && oc.fandoms.some(f => f.toLowerCase() === fandomFilter.toLowerCase());
        });
      }
      
      setOCs(filteredOCs);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch OCs');
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
      // Don't show error to user, just log it
    }
  }, [ocs]);

  useEffect(() => {
    if (ocs.length > 0) {
      fetchUserNames();
    }
  }, [ocs, fetchUserNames]);

  const handleCreate = () => {
    setFormData({
      name: '',
      fandoms: '',
      age: '',
      race: '',
      gender: '',
      birthday: '',
      bioLink: '',
      imageUrl: '',
      foName: '',
      foSource: '',
      relationshipType: '',
      foImageUrl: ''
    });
    setFormImageAlignment('center');
    setIsCreateModalOpen(true);
  };

  const handleEdit = (oc: OC) => {
    setSelectedOC(oc);
    setFormData({
      name: oc.name,
      fandoms: (oc.fandoms && oc.fandoms.length > 0) ? oc.fandoms.join(', ') : '',
      age: oc.age || '',
      race: oc.race || '',
      gender: oc.gender || '',
      birthday: oc.birthday || '',
      bioLink: oc.bioLink || '',
      imageUrl: oc.imageUrl || '',
      foName: oc.yume?.foName || '',
      foSource: oc.yume?.foSource || '',
      relationshipType: oc.yume?.relationshipType || '',
      foImageUrl: oc.yume?.foImageUrl || ''
    });
    setFormImageAlignment((oc.imageAlignment || 'center') as ImageAlignment);
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleView = (oc: OC) => {
    setSelectedOC(oc);
    setIsViewModalOpen(true);
  };

  const handleDelete = (oc: OC) => {
    setSelectedOC(oc);
    setIsViewModalOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const handlePlaylist = (oc: OC) => {
    setSelectedOC(oc);
    setPlaylistSong('');
    setIsViewModalOpen(false);
    setIsPlaylistModalOpen(true);
  };

  const handleNotes = (oc: OC) => {
    setSelectedOC(oc);
    setNewNote('');
    setIsViewModalOpen(false);
    setIsNotesModalOpen(true);
  };

  const submitCreate = async () => {
    try {
      // Parse comma-separated fandoms
      const fandoms = formData.fandoms
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      if (fandoms.length === 0) {
        setError('At least one fandom is required');
        return;
      }

      const yume = (formData.foName || formData.foSource || formData.relationshipType || formData.foImageUrl) ? {
        foName: formData.foName || undefined,
        foSource: formData.foSource || undefined,
        relationshipType: formData.relationshipType || undefined,
        foImageUrl: formData.foImageUrl || undefined
      } : undefined;

      await createOC({
        name: formData.name,
        fandoms: fandoms,
        guildId: GUILD_ID,
        age: formData.age || undefined,
        race: formData.race || undefined,
        gender: formData.gender || undefined,
        birthday: formData.birthday || undefined,
        bioLink: formData.bioLink || undefined,
        imageUrl: formData.imageUrl || undefined,
        imageAlignment: formImageAlignment,
        yume
      });
      
      setIsCreateModalOpen(false);
      fetchOCs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create OC');
    }
  };

  const submitEdit = async () => {
    if (!selectedOC) return;
    
    try {
      // Parse comma-separated fandoms
      const fandoms = formData.fandoms
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      if (fandoms.length === 0) {
        setError('At least one fandom is required');
        return;
      }

      const yume = (formData.foName || formData.foSource || formData.relationshipType || formData.foImageUrl) ? {
        foName: formData.foName || undefined,
        foSource: formData.foSource || undefined,
        relationshipType: formData.relationshipType || undefined,
        foImageUrl: formData.foImageUrl || undefined
      } : undefined;

      await updateOC(selectedOC._id, {
        name: formData.name,
        fandoms: fandoms,
        age: formData.age || undefined,
        race: formData.race || undefined,
        gender: formData.gender || undefined,
        birthday: formData.birthday || undefined,
        bioLink: formData.bioLink || undefined,
        imageUrl: formData.imageUrl || undefined,
        imageAlignment: formImageAlignment,
        yume
      });
      
      setIsEditModalOpen(false);
      fetchOCs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update OC');
    }
  };

  const confirmDelete = async () => {
    if (!selectedOC) return;
    
    try {
      await deleteOC(selectedOC._id);
      setIsDeleteDialogOpen(false);
      setSelectedOC(null);
      fetchOCs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete OC');
    }
  };

  const addPlaylistSong = async () => {
    if (!selectedOC || !playlistSong) return;
    
    try {
      const response = await updateOCPlaylist(selectedOC._id, 'add', playlistSong);
      setPlaylistSong('');
      await fetchOCs();
      // Refresh selected OC from API response or updated state
      const updated = response.data || ocs.find(oc => oc._id === selectedOC._id);
      if (updated) setSelectedOC(updated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add song');
    }
  };

  const removePlaylistSong = async (songLink: string) => {
    if (!selectedOC) return;
    
    try {
      const response = await updateOCPlaylist(selectedOC._id, 'remove', songLink);
      await fetchOCs();
      // Refresh selected OC from API response or updated state
      const updated = response.data || ocs.find(oc => oc._id === selectedOC._id);
      if (updated) setSelectedOC(updated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove song');
    }
  };

  const submitNote = async () => {
    if (!selectedOC || !newNote) return;
    
    try {
      await addOCNote(selectedOC._id, newNote);
      setNewNote('');
      fetchOCs();
      // Refresh selected OC
      const updated = ocs.find(oc => oc._id === selectedOC._id);
      if (updated) setSelectedOC(updated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add note');
    }
  };

  const getRandomOC = () => {
    if (ocs.length === 0) return;
    const random = ocs[Math.floor(Math.random() * ocs.length)];
    handleView(random);
  };

  const filteredOCs = useMemo(() => {
    let filtered = filter === 'mine' 
      ? ocs.filter(() => {
          // In a real app, we'd get the current user ID from auth context
          // For now, we'll show all OCs
          return true;
        })
      : ocs;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(oc => {
        const fandomsText = (oc.fandoms && oc.fandoms.length > 0) ? oc.fandoms.join(', ') : '';
        return oc.name.toLowerCase().includes(searchLower) ||
          fandomsText.toLowerCase().includes(searchLower) ||
          oc.ownerId.toLowerCase().includes(searchLower) ||
          (oc.age && oc.age.toLowerCase().includes(searchLower)) ||
          (oc.gender && oc.gender.toLowerCase().includes(searchLower));
      });
    }

    return filtered;
  }, [ocs, filter, searchTerm]);

  if (loading) {
    return (
      <div className="oc-manager-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="oc-manager-page">
      <div className="oc-manager-header">
        <h1>OC Manager</h1>
        <div className="oc-manager-actions">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'mine')}
            className="oc-manager-filter"
          >
            <option value="all">All OCs</option>
            <option value="mine">My OCs</option>
          </select>
          <select
            value={fandomFilter}
            onChange={(e) => setFandomFilter(e.target.value)}
            className="oc-manager-filter"
          >
            <option value="all">All Fandoms</option>
            {fandoms.map(f => (
              <option key={f.fandom} value={f.fandom}>{f.fandom}</option>
            ))}
          </select>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="oc-manager-filter"
          >
            <option value="all">All Owners</option>
            {owners.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={getRandomOC} disabled={ocs.length === 0}>
            <i className="fas fa-random"></i> Random
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            <i className="fas fa-plus"></i> Create OC
          </button>
        </div>
      </div>

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>Create and manage your Original Characters (OCs). Add details like name, fandom, age, gender, birthday (MM-DD format), and more. You can also add playlists, notes, and yume information. Click on any OC card to view, edit, or delete it.</span>
      </p>

      {error && (
        <div className="oc-manager-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {ocs.length === 0 ? (
        <EmptyState
          icon="fa-star"
          title="No OCs Found"
          message="Create your first OC to get started!"
          action={{ label: 'Create OC', onClick: handleCreate }}
        />
      ) : (
        <>
          <div className="oc-manager-search">
            <input
              type="text"
              placeholder="Search OCs by name, fandom, owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="oc-manager-search-input"
            />
            <i className="fas fa-search oc-manager-search-icon"></i>
          </div>
          {filteredOCs.length === 0 ? (
            <div className="oc-manager-empty-search">
              <p>No OCs found matching your search.</p>
            </div>
          ) : (
            <div className="oc-grid">
              {filteredOCs.map((oc) => (
                <div
                  key={oc._id}
                  className="oc-card"
                  onClick={() => handleView(oc)}
                >
                  <div className="oc-card-image">
                    {oc.imageUrl ? (
                      <img
                        src={oc.imageUrl}
                        alt={oc.name}
                        style={{
                          objectPosition: getObjectPosition((oc.imageAlignment || 'center') as ImageAlignment)
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="oc-card-placeholder">
                        <i className="fas fa-star"></i>
                      </div>
                    )}
                  </div>
                  <div className="oc-card-content">
                    <h3 className="oc-card-name">{oc.name}</h3>
                    <div className="oc-card-fandom">
                      <i className="fas fa-theater-masks"></i>
                      {(oc.fandoms && oc.fandoms.length > 0) ? oc.fandoms.join(', ') : 'None'}
                    </div>
                    <div className="oc-card-owner">
                      <i className="fas fa-user"></i>
                      <span className="oc-card-owner-name">
                        {userMap.get(oc.ownerId)?.globalName || userMap.get(oc.ownerId)?.username || oc.ownerId}
                      </span>
                    </div>
                    <div className="oc-card-details">
                      {oc.age && (
                        <span className="oc-card-detail">
                          <i className="fas fa-birthday-cake"></i> {oc.age}
                        </span>
                      )}
                      {oc.gender && (
                        <span className="oc-card-detail">
                          <i className="fas fa-venus-mars"></i> {oc.gender}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New OC"
        size="lg"
        closeOnOverlayClick={false}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitCreate}>
              Create
            </button>
          </>
        }
      >
        <OCForm 
          formData={formData} 
          setFormData={setFormData}
          imageAlignment={formImageAlignment}
          onImageAlignmentChange={setFormImageAlignment}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit OC"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitEdit}>
              Save Changes
            </button>
          </>
        }
      >
        <OCForm 
          formData={formData} 
          setFormData={setFormData}
          imageAlignment={formImageAlignment}
          onImageAlignmentChange={setFormImageAlignment}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedOC?.name || 'OC Details'}
        size="xl"
        footer={
          selectedOC && (
            <>
              <button className="btn-secondary" onClick={() => handlePlaylist(selectedOC)}>
                <i className="fas fa-music"></i> Playlist
              </button>
              <button className="btn-secondary" onClick={() => handleNotes(selectedOC)}>
                <i className="fas fa-sticky-note"></i> Notes
              </button>
              <button className="btn-secondary" onClick={() => handleEdit(selectedOC)}>
                <i className="fas fa-edit"></i> Edit
              </button>
              <button className="btn-primary" onClick={() => handleDelete(selectedOC)} style={{ background: 'linear-gradient(135deg, var(--color-error) 0%, var(--color-error-light) 100%)' }}>
                <i className="fas fa-trash"></i> Delete
              </button>
            </>
          )
        }
      >
        {selectedOC && (
          <OCDetails 
            oc={selectedOC}
          />
        )}
      </Modal>

      {/* Playlist Modal */}
      <Modal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        title={`${selectedOC?.name}'s Playlist`}
        size="xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsPlaylistModalOpen(false)}>
              Close
            </button>
          </>
        }
      >
        {selectedOC && (
          <div className="oc-playlist">
            <div className="oc-playlist-add">
              <input
                type="text"
                placeholder="Song link (YouTube, Spotify, etc.)"
                value={playlistSong}
                onChange={(e) => setPlaylistSong(e.target.value)}
                className="oc-playlist-input"
              />
              <button className="btn-primary" onClick={addPlaylistSong}>
                <i className="fas fa-plus"></i> Add
              </button>
            </div>
            <div className="oc-playlist-list">
              {selectedOC.playlist.length === 0 ? (
                <div className="oc-playlist-empty">
                  <i className="fas fa-music" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)', opacity: 0.5 }}></i>
                  <p>No songs in playlist yet</p>
                  <small>Add your first song using the input above</small>
                </div>
              ) : (
                selectedOC.playlist.map((song, index) => {
                  const songInfo = parsePlaylistUrl(song);
                  return (
                    <div key={index} className={`oc-playlist-item ${songInfo.type === 'spotify' && songInfo.compact ? 'oc-playlist-item-compact' : ''}`}>
                      <div className="oc-playlist-item-content">
                        {songInfo.type === 'youtube' && songInfo.embedUrl && (
                          <div className="oc-playlist-embed">
                            <iframe
                              width="100%"
                              height="180"
                              src={songInfo.embedUrl}
                              title={`YouTube video ${index + 1}`}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              loading="lazy"
                            ></iframe>
                            <div className="oc-playlist-item-info">
                              <a href={song} target="_blank" rel="noopener noreferrer" className="oc-playlist-link">
                                <i className="fab fa-youtube"></i> {songInfo.displayName}
                              </a>
                            </div>
                          </div>
                        )}
                        {songInfo.type === 'spotify' && songInfo.embedUrl && (
                          <div className={`oc-playlist-embed ${songInfo.compact ? 'oc-playlist-embed-compact' : ''}`}>
                            <iframe
                              style={{ borderRadius: '12px' }}
                              src={songInfo.embedUrl}
                              width="100%"
                              height={songInfo.compact ? "152" : "180"}
                              frameBorder="0"
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                              loading="lazy"
                            ></iframe>
                            <div className="oc-playlist-item-info">
                              <a href={song} target="_blank" rel="noopener noreferrer" className="oc-playlist-link">
                                <i className="fab fa-spotify"></i> {songInfo.displayName}
                              </a>
                            </div>
                          </div>
                        )}
                        {songInfo.type === 'other' && (
                          <div className="oc-playlist-item-info">
                            <a href={song} target="_blank" rel="noopener noreferrer" className="oc-playlist-link">
                              <i className="fas fa-link"></i> {songInfo.displayName}
                            </a>
                          </div>
                        )}
                      </div>
                      <button
                        className="oc-playlist-remove"
                        onClick={() => removePlaylistSong(song)}
                        aria-label="Remove song"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Notes Modal */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title={`${selectedOC?.name}'s Notes`}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsNotesModalOpen(false)}>
              Close
            </button>
          </>
        }
      >
        {selectedOC && (
          <div className="oc-notes">
            <div className="oc-notes-add">
              <FormField
                label="Add Note"
                name="note"
                type="textarea"
                value={newNote}
                onChange={setNewNote}
                placeholder="Enter a note..."
                rows={3}
              />
              <button className="btn-primary" onClick={submitNote} disabled={!newNote.trim()}>
                <i className="fas fa-plus"></i> Add Note
              </button>
            </div>
            <div className="oc-notes-list">
              {selectedOC.notes.length === 0 ? (
                <p className="oc-notes-empty">No notes</p>
              ) : (
                selectedOC.notes.map((note, index) => (
                  <div key={index} className="oc-note-item">
                    <p>{note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete OC"
        message={`Are you sure you want to delete "${selectedOC?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        variant="danger"
      />
    </div>
  );
}

export type ImageAlignment = 'center' | 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

function OCForm({ 
  formData, 
  setFormData,
  imageAlignment = 'center',
  onImageAlignmentChange
}: { 
  formData: any; 
  setFormData: (data: any) => void;
  imageAlignment?: ImageAlignment;
  onImageAlignmentChange?: (alignment: ImageAlignment) => void;
}) {
  return (
    <div className="oc-form">
      <FormField
        label="Name"
        name="name"
        value={formData.name}
        onChange={(value) => setFormData({ ...formData, name: value })}
        placeholder="OC name"
        required
      />
      <FormField
        label="Fandoms"
        name="fandoms"
        value={formData.fandoms}
        onChange={(value) => setFormData({ ...formData, fandoms: value })}
        placeholder="Naruto, Pokemon, Zelda (comma-separated)"
        required
      />
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', marginTop: '-1rem', marginBottom: '1rem' }}>
        Enter one or more fandoms separated by commas. Examples: Naruto, Pokemon, Zelda, Shaman King, Soul Eater, Demon Slayer, Inuyasha
      </p>
      <div className="oc-form-row">
        <FormField
          label="Age"
          name="age"
          value={formData.age}
          onChange={(value) => setFormData({ ...formData, age: value })}
          placeholder="Age"
        />
        <FormField
          label="Gender"
          name="gender"
          value={formData.gender}
          onChange={(value) => setFormData({ ...formData, gender: value })}
          placeholder="Gender"
        />
      </div>
      <div className="oc-form-row">
        <FormField
          label="Race/Species"
          name="race"
          value={formData.race}
          onChange={(value) => setFormData({ ...formData, race: value })}
          placeholder="Race or species"
        />
        <FormField
          label="Birthday (MM-DD)"
          name="birthday"
          value={formData.birthday}
          onChange={(value) => setFormData({ ...formData, birthday: value })}
          placeholder="03-15"
        />
      </div>
      <FormField
        label="Bio Link"
        name="bioLink"
        value={formData.bioLink}
        onChange={(value) => setFormData({ ...formData, bioLink: value })}
        placeholder="Toyhou.se, Carrd, etc."
      />
      <FormField
        label="Image URL"
        name="imageUrl"
        value={formData.imageUrl}
        onChange={(value) => setFormData({ ...formData, imageUrl: value })}
        placeholder="https://example.com/image.png (must be externally hosted)"
      />
      {formData.imageUrl && (
        <div className="oc-form-image-preview">
          <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Image Preview:
          </label>
          <div className="oc-form-image-preview-container">
            <img
              src={formData.imageUrl}
              alt="Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: getObjectPosition(imageAlignment),
                display: 'block'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="oc-form-image-alignment">
            <label style={{ display: 'block', marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Align Image:
            </label>
            <div className="oc-form-alignment-buttons">
              {(['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] as ImageAlignment[]).map((align) => (
                <button
                  key={align}
                  type="button"
                  className={`oc-alignment-btn ${imageAlignment === align ? 'active' : ''}`}
                  onClick={() => onImageAlignmentChange?.(align)}
                  title={align.replace('-', ' ')}
                >
                  <i className={`fas fa-${getAlignmentIcon(align)}`}></i>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="oc-form-section">
        <h4>Yume Information (Optional)</h4>
        <FormField
          label="F/O Name"
          name="foName"
          value={formData.foName}
          onChange={(value) => setFormData({ ...formData, foName: value })}
          placeholder="F/O name"
        />
        <FormField
          label="Fandom"
          name="foSource"
          value={formData.foSource}
          onChange={(value) => setFormData({ ...formData, foSource: value })}
          placeholder="Fandom"
        />
        <FormField
          label="Relationship Type"
          name="relationshipType"
          value={formData.relationshipType}
          onChange={(value) => setFormData({ ...formData, relationshipType: value })}
          placeholder="Relationship type"
        />
        <FormField
          label="F/O Image URL"
          name="foImageUrl"
          value={formData.foImageUrl}
          onChange={(value) => setFormData({ ...formData, foImageUrl: value })}
          placeholder="https://example.com/image.png (must be externally hosted)"
        />
      </div>
    </div>
  );
}

// Helper function to convert alignment to CSS object-position
export function getObjectPosition(alignment: ImageAlignment): string {
  const positions: Record<ImageAlignment, string> = {
    'center': 'center center',
    'top-left': 'left top',
    'top-center': 'center top',
    'top-right': 'right top',
    'center-left': 'left center',
    'center-right': 'right center',
    'bottom-left': 'left bottom',
    'bottom-center': 'center bottom',
    'bottom-right': 'right bottom'
  };
  return positions[alignment] || 'center center';
}

// Helper function to get icon for alignment button
function getAlignmentIcon(alignment: ImageAlignment): string {
  const icons: Record<ImageAlignment, string> = {
    'center': 'arrows-alt',
    'top-left': 'arrow-up-left',
    'top-center': 'arrow-up',
    'top-right': 'arrow-up-right',
    'center-left': 'arrow-left',
    'center-right': 'arrow-right',
    'bottom-left': 'arrow-down-left',
    'bottom-center': 'arrow-down',
    'bottom-right': 'arrow-down-right'
  };
  return icons[alignment] || 'arrows-alt';
}

export function OCDetails({ oc }: { oc: OC }) {
  return (
    <div className="oc-details">
      {oc.imageUrl && (
        <div className="oc-details-image">
          <img 
            src={oc.imageUrl} 
            alt={oc.name}
            style={{
              objectPosition: getObjectPosition((oc.imageAlignment || 'center') as ImageAlignment)
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} 
          />
        </div>
      )}
      <div className="oc-details-content">
        <div className="oc-details-section">
          <h3>
            <i className="fas fa-info-circle"></i>
            Basic Information
          </h3>
          <div className="oc-details-grid">
            <div className="oc-details-item">
              <div className="oc-details-item-icon">
                <i className="fas fa-user"></i>
              </div>
              <div className="oc-details-item-content">
                <span className="oc-details-item-label">Name</span>
                <span className="oc-details-item-value">{oc.name}</span>
              </div>
            </div>
            <div className="oc-details-item">
              <div className="oc-details-item-icon">
                <i className="fas fa-theater-masks"></i>
              </div>
              <div className="oc-details-item-content">
                <span className="oc-details-item-label">Fandom{(oc.fandoms && oc.fandoms.length > 1) ? 's' : ''}</span>
                <span className="oc-details-item-value">{(oc.fandoms && oc.fandoms.length > 0) ? oc.fandoms.join(', ') : 'None'}</span>
              </div>
            </div>
            {oc.age && (
              <div className="oc-details-item">
                <div className="oc-details-item-icon">
                  <i className="fas fa-birthday-cake"></i>
                </div>
                <div className="oc-details-item-content">
                  <span className="oc-details-item-label">Age</span>
                  <span className="oc-details-item-value">{oc.age}</span>
                </div>
              </div>
            )}
            {oc.race && (
              <div className="oc-details-item">
                <div className="oc-details-item-icon">
                  <i className="fas fa-dna"></i>
                </div>
                <div className="oc-details-item-content">
                  <span className="oc-details-item-label">Race</span>
                  <span className="oc-details-item-value">{oc.race}</span>
                </div>
              </div>
            )}
            {oc.gender && (
              <div className="oc-details-item">
                <div className="oc-details-item-icon">
                  <i className="fas fa-venus-mars"></i>
                </div>
                <div className="oc-details-item-content">
                  <span className="oc-details-item-label">Gender</span>
                  <span className="oc-details-item-value">{oc.gender}</span>
                </div>
              </div>
            )}
            {oc.birthday && (
              <div className="oc-details-item">
                <div className="oc-details-item-icon">
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <div className="oc-details-item-content">
                  <span className="oc-details-item-label">Birthday</span>
                  <span className="oc-details-item-value">{oc.birthday}</span>
                </div>
              </div>
            )}
            {oc.bioLink && (
              <div className="oc-details-item oc-details-item-full">
                <div className="oc-details-item-icon">
                  <i className="fas fa-link"></i>
                </div>
                <div className="oc-details-item-content">
                  <span className="oc-details-item-label">Bio Link</span>
                  <a href={oc.bioLink} target="_blank" rel="noopener noreferrer" className="oc-details-item-link">
                    {oc.bioLink}
                    <i className="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {oc.yume && (oc.yume.foName || oc.yume.foSource || oc.yume.relationshipType || oc.yume.foImageUrl) && (
          <div className="oc-details-section">
            <h3>
              <i className="fas fa-heart"></i>
              Yume Information
            </h3>
            {oc.yume.foImageUrl && (
              <div className="oc-details-fo-image">
                <img src={oc.yume.foImageUrl} alt={oc.yume.foName || 'F/O'} onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
              </div>
            )}
            <div className="oc-details-grid">
              {oc.yume.foName && (
                <div className="oc-details-item">
                  <div className="oc-details-item-icon">
                    <i className="fas fa-user-circle"></i>
                  </div>
                  <div className="oc-details-item-content">
                    <span className="oc-details-item-label">F/O Name</span>
                    <span className="oc-details-item-value">{oc.yume.foName}</span>
                  </div>
                </div>
              )}
              {oc.yume.foSource && (
                <div className="oc-details-item">
                  <div className="oc-details-item-icon">
                    <i className="fas fa-theater-masks"></i>
                  </div>
                  <div className="oc-details-item-content">
                    <span className="oc-details-item-label">Fandom</span>
                    <span className="oc-details-item-value">{oc.yume.foSource}</span>
                  </div>
                </div>
              )}
              {oc.yume.relationshipType && (
                <div className="oc-details-item">
                  <div className="oc-details-item-icon">
                    <i className="fas fa-heart"></i>
                  </div>
                  <div className="oc-details-item-content">
                    <span className="oc-details-item-label">Relationship Type</span>
                    <span className="oc-details-item-value">{oc.yume.relationshipType}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="oc-details-section">
          <h3>
            <i className="fas fa-chart-bar"></i>
            Statistics
          </h3>
          <div className="oc-details-grid">
            <div className="oc-details-item">
              <div className="oc-details-item-icon">
                <i className="fas fa-music"></i>
              </div>
              <div className="oc-details-item-content">
                <span className="oc-details-item-label">Playlist Songs</span>
                <span className="oc-details-item-value">{oc.playlist.length}</span>
              </div>
            </div>
            <div className="oc-details-item">
              <div className="oc-details-item-icon">
                <i className="fas fa-sticky-note"></i>
              </div>
              <div className="oc-details-item-content">
                <span className="oc-details-item-label">Notes</span>
                <span className="oc-details-item-value">{oc.notes.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
