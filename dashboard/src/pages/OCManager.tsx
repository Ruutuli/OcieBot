import { useState, useEffect, useMemo, useCallback } from 'react';
import { getOCs, createOC, updateOC, deleteOC, updateOCPlaylist, addOCNote, getUsers } from '../services/api';
import { GUILD_ID } from '../constants';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './OCManager.css';

interface OC {
  _id: string;
  name: string;
  ownerId: string;
  guildId: string;
  fandom: string;
  age?: string;
  race?: string;
  gender?: string;
  birthday?: string;
  bioLink?: string;
  imageUrl?: string;
  yume?: {
    foName?: string;
    foSource?: string;
    relationshipType?: string;
    tags?: string[];
    link?: string;
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
  
  const [formData, setFormData] = useState({
    name: '',
    fandom: '',
    age: '',
    race: '',
    gender: '',
    birthday: '',
    bioLink: '',
    imageUrl: '',
    foName: '',
    foSource: '',
    relationshipType: ''
  });
  
  const [playlistSong, setPlaylistSong] = useState('');
  const [newNote, setNewNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userMap, setUserMap] = useState<Map<string, { username: string; globalName?: string }>>(new Map());

  useEffect(() => {
    fetchOCs();
  }, [filter]);

  const fetchOCs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOCs(GUILD_ID);
      setOCs(response.data);
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
      fandom: '',
      age: '',
      race: '',
      gender: '',
      birthday: '',
      bioLink: '',
      imageUrl: '',
      foName: '',
      foSource: '',
      relationshipType: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (oc: OC) => {
    setSelectedOC(oc);
    setFormData({
      name: oc.name,
      fandom: oc.fandom,
      age: oc.age || '',
      race: oc.race || '',
      gender: oc.gender || '',
      birthday: oc.birthday || '',
      bioLink: oc.bioLink || '',
      imageUrl: oc.imageUrl || '',
      foName: oc.yume?.foName || '',
      foSource: oc.yume?.foSource || '',
      relationshipType: oc.yume?.relationshipType || ''
    });
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
      const yume = (formData.foName || formData.foSource || formData.relationshipType) ? {
        foName: formData.foName || undefined,
        foSource: formData.foSource || undefined,
        relationshipType: formData.relationshipType || undefined
      } : undefined;

      await createOC({
        name: formData.name,
        fandom: formData.fandom,
        guildId: GUILD_ID,
        age: formData.age || undefined,
        race: formData.race || undefined,
        gender: formData.gender || undefined,
        birthday: formData.birthday || undefined,
        bioLink: formData.bioLink || undefined,
        imageUrl: formData.imageUrl || undefined,
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
      const yume = (formData.foName || formData.foSource || formData.relationshipType) ? {
        foName: formData.foName || undefined,
        foSource: formData.foSource || undefined,
        relationshipType: formData.relationshipType || undefined
      } : undefined;

      await updateOC(selectedOC._id, {
        name: formData.name,
        fandom: formData.fandom,
        age: formData.age || undefined,
        race: formData.race || undefined,
        gender: formData.gender || undefined,
        birthday: formData.birthday || undefined,
        bioLink: formData.bioLink || undefined,
        imageUrl: formData.imageUrl || undefined,
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
      await updateOCPlaylist(selectedOC._id, 'add', playlistSong);
      setPlaylistSong('');
      fetchOCs();
      // Refresh selected OC
      const updated = ocs.find(oc => oc._id === selectedOC._id);
      if (updated) setSelectedOC(updated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add song');
    }
  };

  const removePlaylistSong = async (songLink: string) => {
    if (!selectedOC) return;
    
    try {
      await updateOCPlaylist(selectedOC._id, 'remove', songLink);
      fetchOCs();
      // Refresh selected OC
      const updated = ocs.find(oc => oc._id === selectedOC._id);
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
      filtered = filtered.filter(oc =>
        oc.name.toLowerCase().includes(searchLower) ||
        oc.fandom.toLowerCase().includes(searchLower) ||
        oc.ownerId.toLowerCase().includes(searchLower) ||
        (oc.age && oc.age.toLowerCase().includes(searchLower)) ||
        (oc.gender && oc.gender.toLowerCase().includes(searchLower))
      );
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
                      {oc.fandom}
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
        <OCForm formData={formData} setFormData={setFormData} />
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
        <OCForm formData={formData} setFormData={setFormData} />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedOC?.name || 'OC Details'}
        size="lg"
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
        {selectedOC && <OCDetails oc={selectedOC} />}
      </Modal>

      {/* Playlist Modal */}
      <Modal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        title={`${selectedOC?.name}'s Playlist`}
        size="md"
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
                <p className="oc-playlist-empty">No songs in playlist</p>
              ) : (
                selectedOC.playlist.map((song, index) => (
                  <div key={index} className="oc-playlist-item">
                    <a href={song} target="_blank" rel="noopener noreferrer" className="oc-playlist-link">
                      {song}
                    </a>
                    <button
                      className="oc-playlist-remove"
                      onClick={() => removePlaylistSong(song)}
                      aria-label="Remove song"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))
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

function OCForm({ formData, setFormData }: { formData: any; setFormData: (data: any) => void }) {
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
        label="Fandom"
        name="fandom"
        value={formData.fandom}
        onChange={(value) => setFormData({ ...formData, fandom: value })}
        placeholder="Fandom name"
        required
      />
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
      </div>
    </div>
  );
}

function OCDetails({ oc }: { oc: OC }) {
  return (
    <div className="oc-details">
      {oc.imageUrl && (
        <div className="oc-details-image">
          <img src={oc.imageUrl} alt={oc.name} onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
        </div>
      )}
      <div className="oc-details-section">
        <h3>Basic Information</h3>
        <div className="oc-details-grid">
          <div className="oc-details-item">
            <strong>Name:</strong> {oc.name}
          </div>
          <div className="oc-details-item">
            <strong>Fandom:</strong> {oc.fandom}
          </div>
          {oc.age && (
            <div className="oc-details-item">
              <strong>Age:</strong> {oc.age}
            </div>
          )}
          {oc.race && (
            <div className="oc-details-item">
              <strong>Race:</strong> {oc.race}
            </div>
          )}
          {oc.gender && (
            <div className="oc-details-item">
              <strong>Gender:</strong> {oc.gender}
            </div>
          )}
          {oc.birthday && (
            <div className="oc-details-item">
              <strong>Birthday:</strong> {oc.birthday}
            </div>
          )}
          {oc.bioLink && (
            <div className="oc-details-item">
              <strong>Bio Link:</strong>{' '}
              <a href={oc.bioLink} target="_blank" rel="noopener noreferrer">
                {oc.bioLink}
              </a>
            </div>
          )}
        </div>
      </div>
      
      {oc.yume && (oc.yume.foName || oc.yume.foSource || oc.yume.relationshipType) && (
        <div className="oc-details-section">
          <h3>Yume Information</h3>
          <div className="oc-details-grid">
            {oc.yume.foName && (
              <div className="oc-details-item">
                <strong>F/O Name:</strong> {oc.yume.foName}
              </div>
            )}
            {oc.yume.foSource && (
              <div className="oc-details-item">
                <strong>Fandom:</strong> {oc.yume.foSource}
              </div>
            )}
            {oc.yume.relationshipType && (
              <div className="oc-details-item">
                <strong>Relationship Type:</strong> {oc.yume.relationshipType}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="oc-details-section">
        <h3>Statistics</h3>
        <div className="oc-details-grid">
          <div className="oc-details-item">
            <strong>Playlist Songs:</strong> {oc.playlist.length}
          </div>
          <div className="oc-details-item">
            <strong>Notes:</strong> {oc.notes.length}
          </div>
        </div>
      </div>
    </div>
  );
}
