import { useState, useEffect } from 'react';
import { getQOTDs, createQOTD, updateQOTD, deleteQOTD, getFandoms, getUsers } from '../services/api';
import { GUILD_ID } from '../constants';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './QOTDManager.css';

interface QOTD {
  _id: string;
  id?: string; // Custom ID in format Q12345
  question: string;
  category: 'OC General' | 'Worldbuilding' | 'Yume' | 'Character Development' | 'Relationships' | 'Backstory' | 'Personality' | 'Appearance' | 'Misc';
  fandom?: string;
  guildId: string;
  createdById: string;
  timesUsed: number;
  createdAt: string;
}

interface Fandom {
  fandom: string;
  ocCount: number;
  userCount: number;
}

const CATEGORIES = ['OC General', 'Worldbuilding', 'Yume', 'Character Development', 'Relationships', 'Backstory', 'Personality', 'Appearance', 'Misc'] as const;

export default function QOTDManager() {
  const [qotds, setQOTDs] = useState<QOTD[]>([]);
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedQOTD, setSelectedQOTD] = useState<QOTD | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fandomFilter, setFandomFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [userMap, setUserMap] = useState<Map<string, { username: string; globalName?: string }>>(new Map());
  
  const [formData, setFormData] = useState({
    question: '',
    category: 'Misc' as QOTD['category'],
    fandom: '' as string | undefined
  });

  useEffect(() => {
    fetchFandoms();
  }, []);

  useEffect(() => {
    fetchQOTDs();
  }, [categoryFilter, fandomFilter, ownerFilter]);

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
      // Fetch all QOTDs to get unique owners
      const response = await getQOTDs(GUILD_ID);
      const uniqueOwnerIds = [...new Set(response.data.map((q: QOTD) => q.createdById))];
      
      if (uniqueOwnerIds.length > 0) {
        const usersResponse = await getUsers(uniqueOwnerIds, GUILD_ID);
        const users = usersResponse.data;
        const newUserMap = new Map<string, { username: string; globalName?: string }>();
        const ownersList: Array<{ id: string; name: string }> = [];
        
        users.forEach((user: any) => {
          newUserMap.set(user.id, {
            username: user.username,
            globalName: user.globalName
          });
          ownersList.push({
            id: user.id,
            name: user.globalName || user.username
          });
        });
        
        setUserMap(newUserMap);
        setOwners(ownersList.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (err: any) {
      console.error('Failed to fetch owners:', err);
    }
  };

  const fetchQOTDs = async () => {
    try {
      setLoading(true);
      setError(null);
      const category = categoryFilter === 'all' ? undefined : categoryFilter;
      let fandom: string | undefined;
      if (fandomFilter === 'none') {
        // Filter for QOTDs without fandom - we'll need to filter client-side
        fandom = undefined;
      } else if (fandomFilter !== 'all') {
        fandom = fandomFilter;
      }
      const createdById = ownerFilter === 'all' ? undefined : ownerFilter;
      const response = await getQOTDs(GUILD_ID, category, fandom, createdById);
      let filteredQOTDs = response.data;
      // If filtering for "none", filter out QOTDs that have a fandom
      if (fandomFilter === 'none') {
        filteredQOTDs = filteredQOTDs.filter((q: QOTD) => !q.fandom || q.fandom.trim() === '');
      }
      setQOTDs(filteredQOTDs);
      
      // Fetch owners if not already fetched
      if (owners.length === 0) {
        fetchOwners();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch QOTDs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ question: '', category: 'Misc', fandom: undefined });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (qotd: QOTD) => {
    setSelectedQOTD(qotd);
    setFormData({
      question: qotd.question,
      category: qotd.category,
      fandom: qotd.fandom || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (qotd: QOTD) => {
    setSelectedQOTD(qotd);
    setIsDeleteDialogOpen(true);
  };

  const submitCreate = async () => {
    try {
      const data: any = {
        question: formData.question,
        category: formData.category,
        guildId: GUILD_ID
      };
      if (formData.fandom && formData.fandom.trim() !== '') {
        data.fandom = formData.fandom;
      }
      await createQOTD(data);
      
      setIsCreateModalOpen(false);
      fetchQOTDs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create QOTD');
    }
  };

  const submitEdit = async () => {
    if (!selectedQOTD) return;
    
    try {
      const data: any = {
        question: formData.question,
        category: formData.category
      };
      if (formData.fandom && formData.fandom.trim() !== '') {
        data.fandom = formData.fandom;
      } else {
        data.fandom = undefined;
      }
      await updateQOTD(selectedQOTD._id, data);
      
      setIsEditModalOpen(false);
      setSelectedQOTD(null);
      fetchQOTDs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update QOTD');
    }
  };

  const confirmDelete = async () => {
    if (!selectedQOTD) return;
    
    try {
      await deleteQOTD(selectedQOTD._id);
      setIsDeleteDialogOpen(false);
      setSelectedQOTD(null);
      fetchQOTDs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete QOTD');
    }
  };

  const askRandomQOTD = () => {
    if (qotds.length === 0) return;
    const random = qotds[Math.floor(Math.random() * qotds.length)];
    alert(`Question of the Day:\n\n${random.question}\n\nCategory: ${random.category}\nUsed ${random.timesUsed} times`);
  };

  const columns = [
    {
      key: 'question',
      label: 'Question',
      render: (qotd: QOTD) => {
        const displayId = qotd.id || `Q${qotd._id.substring(0, 4).toUpperCase()}`;
        return (
          <div>
            <strong>{qotd.question}</strong>
            <div style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
              Category: {qotd.category}
              {qotd.fandom && <span> • Fandom: <strong style={{ color: 'var(--color-primary)' }}>{qotd.fandom}</strong></span>}
              <span> • Used {qotd.timesUsed}x • ID: <span style={{ backgroundColor: 'var(--color-bg)', padding: '2px 6px', borderRadius: '4px' }}>{displayId}</span></span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true
    },
    {
      key: 'fandom',
      label: 'Fandom',
      render: (qotd: QOTD) => qotd.fandom ? (
        <span style={{ 
          display: 'inline-block',
          padding: '4px 8px',
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary-dark)',
          borderRadius: '4px',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          {qotd.fandom}
        </span>
      ) : (
        <span style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>None</span>
      ),
      sortable: true
    },
    {
      key: 'timesUsed',
      label: 'Times Used',
      sortable: true
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (qotd: QOTD) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(qotd);
            }}
            style={{ padding: '4px 8px', fontSize: '0.875rem' }}
            title="Edit QOTD"
          >
            <i className="fas fa-edit"></i> Edit
          </button>
          <button
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(qotd);
            }}
            style={{ 
              padding: '4px 8px', 
              fontSize: '0.875rem',
              background: 'linear-gradient(135deg, var(--color-error) 0%, var(--color-error-light) 100%)',
              color: 'white'
            }}
            title="Delete QOTD"
          >
            <i className="fas fa-trash"></i> Delete
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="qotd-manager-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="qotd-manager-page">
      <div className="qotd-manager-header">
        <h1>QOTD Manager</h1>
        <div className="qotd-manager-actions">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="qotd-manager-filter"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={fandomFilter}
            onChange={(e) => setFandomFilter(e.target.value)}
            className="qotd-manager-filter"
          >
            <option value="all">All Fandoms</option>
            <option value="none">No Fandom</option>
            {fandoms.map(f => (
              <option key={f.fandom} value={f.fandom}>{f.fandom}</option>
            ))}
          </select>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="qotd-manager-filter"
          >
            <option value="all">All Owners</option>
            {owners.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={askRandomQOTD} disabled={qotds.length === 0}>
            <i className="fas fa-question-circle"></i> Ask Random
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            <i className="fas fa-plus"></i> Create QOTD
          </button>
        </div>
      </div>

      {error && (
        <div className="qotd-manager-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>Manage Questions of the Day (QOTD) for your server. Create new questions with categories, filter by category, and use the <strong>Ask Random</strong> button to post a random QOTD to Discord. QOTD can be scheduled automatically in the <strong>Settings</strong> page.</span>
      </p>

      {qotds.length === 0 ? (
        <EmptyState
          icon="fa-question-circle"
          title="No QOTDs Found"
          message="Create your first QOTD to get started!"
          action={{ label: 'Create QOTD', onClick: handleCreate }}
        />
      ) : (
        <DataTable
          data={qotds}
          columns={columns}
          keyExtractor={(qotd) => qotd._id}
          searchable
          searchPlaceholder="Search QOTDs..."
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New QOTD"
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
          label="Question"
          name="question"
          type="textarea"
          value={formData.question}
          onChange={(value) => setFormData({ ...formData, question: value })}
          placeholder="Enter the question"
          required
          rows={4}
        />
        <FormField
          label="Category"
          name="category"
          type="select"
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value as QOTD['category'] })}
          required
          options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
        />
        <FormField
          label="Fandom (Optional)"
          name="fandom"
          type="select"
          value={formData.fandom || ''}
          onChange={(value) => setFormData({ ...formData, fandom: value === '' ? undefined : value })}
          options={[
            { value: '', label: 'None (General)' },
            ...fandoms.map(f => ({ value: f.fandom, label: f.fandom }))
          ]}
        />
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', marginTop: 'var(--spacing-sm)' }}>
          Select a fandom if this QOTD is specific to a particular fandom. Leave as "None" for general QOTDs.
        </p>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedQOTD(null);
        }}
        title="Edit QOTD"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => {
              setIsEditModalOpen(false);
              setSelectedQOTD(null);
            }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitEdit}>
              Save Changes
            </button>
          </>
        }
      >
        <FormField
          label="Question"
          name="question"
          type="textarea"
          value={formData.question}
          onChange={(value) => setFormData({ ...formData, question: value })}
          placeholder="Enter the question"
          required
          rows={4}
        />
        <FormField
          label="Category"
          name="category"
          type="select"
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value as QOTD['category'] })}
          required
          options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
        />
        <FormField
          label="Fandom (Optional)"
          name="fandom"
          type="select"
          value={formData.fandom || ''}
          onChange={(value) => setFormData({ ...formData, fandom: value === '' ? undefined : value })}
          options={[
            { value: '', label: 'None (General)' },
            ...fandoms.map(f => ({ value: f.fandom, label: f.fandom }))
          ]}
        />
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', marginTop: 'var(--spacing-sm)' }}>
          Select a fandom if this QOTD is specific to a particular fandom. Leave as "None" for general QOTDs.
        </p>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete QOTD"
        message={`Are you sure you want to delete this QOTD? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        variant="danger"
      />
    </div>
  );
}
