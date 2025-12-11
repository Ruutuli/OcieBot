import { useState, useEffect } from 'react';
import { getTrivia, createTrivia, updateTrivia, deleteTrivia, getOCs, getFandoms, getUsers } from '../services/api';
import { GUILD_ID } from '../constants';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import './TriviaManager.css';

interface Trivia {
  _id: string;
  id?: string; // Custom ID in format T12345
  question: string;
  guildId: string;
  createdById: string;
  ocId: string | { _id: string; name: string };
  createdAt: string;
}

export default function TriviaManager() {
  const [trivias, setTrivias] = useState<Trivia[]>([]);
  const [userOCs, setUserOCs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedTrivia, setSelectedTrivia] = useState<Trivia | null>(null);
  const [fandomFilter, setFandomFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [fandoms, setFandoms] = useState<Array<{ fandom: string; ocCount: number; userCount: number }>>([]);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  
  const [formData, setFormData] = useState({
    question: '',
    ocName: ''
  });

  useEffect(() => {
    fetchUser();
    fetchFandoms();
    fetchTrivia();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserOCs();
    }
  }, [userId]);

  useEffect(() => {
    fetchTrivia();
  }, [fandomFilter, ownerFilter]);

  const fetchFandoms = async () => {
    try {
      const response = await getFandoms(GUILD_ID);
      setFandoms(response.data);
    } catch (err: any) {
      console.error('Failed to fetch fandoms:', err);
    }
  };

  const fetchOwners = async () => {
    try {
      // Fetch all trivia to get unique OC owners
      const response = await getTrivia(GUILD_ID);
      const uniqueOwnerIds = new Set<string>();
      
      response.data.forEach((trivia: Trivia) => {
        const oc = typeof trivia.ocId === 'object' ? trivia.ocId : null;
        if (oc && (oc as any).ownerId) {
          uniqueOwnerIds.add((oc as any).ownerId);
        }
      });
      
      if (uniqueOwnerIds.size > 0) {
        const usersResponse = await getUsers(Array.from(uniqueOwnerIds), GUILD_ID);
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

  const fetchTrivia = async () => {
    try {
      setLoading(true);
      setError(null);
      const ownerId = ownerFilter === 'all' ? undefined : ownerFilter;
      const fandom = fandomFilter === 'all' ? undefined : fandomFilter;
      const response = await getTrivia(GUILD_ID, undefined, ownerId, fandom);
      setTrivias(response.data);
      
      // Fetch owners if not already fetched
      if (owners.length === 0) {
        fetchOwners();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch trivia');
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUserId(response.data.user.id);
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchUserOCs = async () => {
    if (!userId) return;
    try {
      const response = await getOCs(GUILD_ID, { ownerId: userId });
      setUserOCs(response.data);
    } catch (err: any) {
      console.error('Failed to fetch user OCs:', err);
      setUserOCs([]);
    }
  };

  const handleCreate = () => {
    setFormData({
      question: '',
      ocName: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (trivia: Trivia) => {
    const oc = typeof trivia.ocId === 'object' ? trivia.ocId.name : 'Unknown OC';
    setFormData({
      question: trivia.question,
      ocName: oc
    });
    setSelectedTrivia(trivia);
    setIsEditModalOpen(true);
  };

  const handleDelete = (trivia: Trivia) => {
    setSelectedTrivia(trivia);
    setIsDeleteDialogOpen(true);
  };

  const submitCreate = async () => {
    try {
      if (!formData.ocName) {
        setError('OC name is required!');
        return;
      }

      const oc = userOCs.find((o: any) => o.name === formData.ocName);
      if (!oc) {
        setError(`OC "${formData.ocName}" not found!`);
        return;
      }

      await createTrivia({
        question: formData.question,
        guildId: GUILD_ID,
        ocId: oc._id
      });
      
      setIsCreateModalOpen(false);
      setError(null);
      fetchTrivia();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create trivia');
    }
  };

  const submitEdit = async () => {
    if (!selectedTrivia) return;
    
    try {
      if (!formData.ocName) {
        setError('OC name is required!');
        return;
      }

      const oc = userOCs.find((o: any) => o.name === formData.ocName);
      if (!oc) {
        setError(`OC "${formData.ocName}" not found!`);
        return;
      }

      await updateTrivia(selectedTrivia._id, {
        question: formData.question,
        ocId: oc._id
      });
      
      setIsEditModalOpen(false);
      setSelectedTrivia(null);
      setError(null);
      fetchTrivia();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update trivia');
    }
  };

  const confirmDelete = async () => {
    if (!selectedTrivia) return;
    
    try {
      await deleteTrivia(selectedTrivia._id);
      setIsDeleteDialogOpen(false);
      setSelectedTrivia(null);
      fetchTrivia();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete trivia');
    }
  };

  const columns = [
    {
      key: 'question',
      label: 'Question',
      render: (trivia: Trivia) => {
        const oc = typeof trivia.ocId === 'object' ? trivia.ocId.name : 'Unknown OC';
        const displayId = trivia.id || `T${trivia._id.substring(0, 4).toUpperCase()}`;
        return (
          <div>
            <strong>{trivia.question}</strong>
            <div style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
              Answer: {oc} • ID: <span style={{ backgroundColor: 'var(--color-bg)', padding: '2px 6px', borderRadius: '4px' }}>{displayId}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (trivia: Trivia) => {
        const isOwner = trivia.createdById === userId;
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            {isOwner && (
              <button
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(trivia);
                }}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '0.875rem'
                }}
                title="Edit Trivia"
              >
                <i className="fas fa-edit"></i> Edit
              </button>
            )}
            {isOwner && (
              <button
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(trivia);
                }}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '0.875rem',
                  background: 'linear-gradient(135deg, var(--color-error) 0%, var(--color-error-light) 100%)',
                  color: 'white'
                }}
                title="Delete Trivia"
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            )}
          </div>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div className="trivia-manager-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="trivia-manager-page">
      <div className="trivia-manager-header">
        <h1>Trivia Manager</h1>
        <div className="trivia-manager-actions">
          <select
            value={fandomFilter}
            onChange={(e) => setFandomFilter(e.target.value)}
            className="trivia-manager-filter"
          >
            <option value="all">All Fandoms</option>
            {fandoms.map(f => (
              <option key={f.fandom} value={f.fandom}>{f.fandom}</option>
            ))}
          </select>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="trivia-manager-filter"
          >
            <option value="all">All Owners</option>
            {owners.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={handleCreate}>
            <i className="fas fa-plus"></i> Create Trivia Question
          </button>
        </div>
      </div>

      {error && (
        <div className="trivia-manager-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>Create and manage trivia questions about OCs. Each question is tied to a specific OC (the answer). Users can play trivia by ID using <code>/trivia play</code> and answer with <code>/trivia answer</code>.</span>
      </p>

      {trivias.length === 0 ? (
        <EmptyState
          icon="fa-brain"
          title="No Trivia Found"
          message="Create your first trivia question to get started!"
          action={{ label: 'Create Trivia Question', onClick: handleCreate }}
        />
      ) : (
        <DataTable
          data={trivias}
          columns={columns}
          keyExtractor={(trivia) => trivia._id}
          searchable
          searchPlaceholder="Search trivia..."
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Trivia Question"
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
        <FormField
          label="Trivia Question"
          name="question"
          type="textarea"
          value={formData.question}
          onChange={(value) => setFormData({ ...formData, question: value })}
          placeholder="Enter a question about the OC (e.g., 'Which OC loves chocolate cake?')"
          required
          rows={3}
        />
        <FormField
          label="OC Name (Answer)"
          name="ocName"
          type="select"
          value={formData.ocName}
          onChange={(value) => setFormData({ ...formData, ocName: value })}
          required
          options={userOCs.length > 0 
            ? userOCs.map((oc: any) => ({ value: oc.name, label: oc.name }))
            : [{ value: '', label: 'No OCs found - create an OC first!' }]
          }
        />
        {userOCs.length === 0 && (
          <div style={{ marginTop: '8px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
            <i className="fas fa-info-circle"></i> You don't have any OCs yet. Create an OC first to add trivia questions.
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTrivia(null);
        }}
        title="Edit Trivia Question"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => {
              setIsEditModalOpen(false);
              setSelectedTrivia(null);
            }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitEdit}>
              Update
            </button>
          </>
        }
      >
        <FormField
          label="Trivia Question"
          name="question"
          type="textarea"
          value={formData.question}
          onChange={(value) => setFormData({ ...formData, question: value })}
          placeholder="Enter a question about the OC (e.g., 'Which OC loves chocolate cake?')"
          required
          rows={3}
        />
        <FormField
          label="OC Name (Answer)"
          name="ocName"
          type="select"
          value={formData.ocName}
          onChange={(value) => setFormData({ ...formData, ocName: value })}
          required
          options={userOCs.length > 0 
            ? userOCs.map((oc: any) => ({ value: oc.name, label: oc.name }))
            : [{ value: '', label: 'No OCs found - create an OC first!' }]
          }
        />
        {userOCs.length === 0 && (
          <div style={{ marginTop: '8px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
            <i className="fas fa-info-circle"></i> You don't have any OCs yet. Create an OC first to add trivia questions.
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Trivia Question"
        message={`Are you sure you want to delete this trivia question? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        variant="danger"
      />
    </div>
  );
}
