import { useState, useEffect } from 'react';
import { GUILD_ID } from '../constants';
import { getPrompts, createPrompt, updatePrompt, deletePrompt, getFandoms } from '../services/api';
import api from '../services/api';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './PromptManager.css';

interface Prompt {
  _id: string;
  text: string;
  category: 'General' | 'RP' | 'Worldbuilding' | 'Misc';
  fandom?: string;
  guildId: string;
  createdById: string;
  createdAt: string;
}

interface Fandom {
  fandom: string;
  ocCount: number;
  userCount: number;
}

const CATEGORIES = ['General', 'RP', 'Worldbuilding', 'Misc'] as const;

export default function PromptManager() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fandomFilter, setFandomFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    text: '',
    category: 'General' as Prompt['category'],
    fandom: '' as string | undefined
  });

  useEffect(() => {
    fetchFandoms();
    fetchUser();
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [categoryFilter, fandomFilter]);

  const fetchFandoms = async () => {
    try {
      const response = await getFandoms(GUILD_ID);
      setFandoms(response.data);
    } catch (err: any) {
      console.error('Failed to fetch fandoms:', err);
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

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const category = categoryFilter === 'all' ? undefined : categoryFilter;
      let fandom: string | undefined;
      if (fandomFilter === 'none') {
        fandom = undefined;
      } else if (fandomFilter !== 'all') {
        fandom = fandomFilter;
      }
      const response = await getPrompts(GUILD_ID, category, fandom);
      let filteredPrompts = response.data;
      // If filtering for "none", filter out prompts that have a fandom
      if (fandomFilter === 'none') {
        filteredPrompts = filteredPrompts.filter((p: Prompt) => !p.fandom || p.fandom.trim() === '');
      }
      setPrompts(filteredPrompts);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ text: '', category: 'General', fandom: undefined });
    setError(null); // Clear any previous errors when opening modal
    setIsCreateModalOpen(true);
  };

  const handleEdit = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setFormData({
      text: prompt.text,
      category: prompt.category,
      fandom: prompt.fandom || ''
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleDelete = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsDeleteDialogOpen(true);
  };

  const validatePromptText = (text: string): string | null => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return 'Prompt text cannot be empty.';
    }

    // Validate OC-neutral text - only block phrases that assume character actions
    const textLower = trimmedText.toLowerCase();
    const actionPhrases = [
      'your oc',
      'your character',
      'they do',
      'they feel',
      'they think',
      'they decide',
      'they choose',
      'they want',
      'they need',
      'he does',
      'he feels',
      'he thinks',
      'she does',
      'she feels',
      'she thinks',
      'it does',
      'it feels',
      'it thinks',
      'you do',
      'you feel',
      'you think',
      'you decide',
      'you choose'
    ];
    
    const hasAssumedActions = actionPhrases.some(phrase => 
      textLower.includes(phrase)
    );
    
    if (hasAssumedActions) {
      return 'Prompts should be scenario-based and not assume character actions. Please rewrite to be OC-neutral.';
    }
    
    return null;
  };

  const submitCreate = async () => {
    const validationError = validatePromptText(formData.text);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null); // Clear any previous errors
      const trimmedText = formData.text.trim();
      const data: any = {
        text: trimmedText,
        category: formData.category,
        guildId: GUILD_ID
      };
      if (formData.fandom && formData.fandom.trim() !== '') {
        data.fandom = formData.fandom.trim();
      }
      await createPrompt(data);
      
      // Close modal and reset form on success
      setIsCreateModalOpen(false);
      setFormData({ text: '', category: 'General', fandom: undefined });
      setError(null); // Clear any errors
      fetchPrompts();
    } catch (err: any) {
      console.error('Error creating prompt:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create prompt';
      setError(errorMessage);
    }
  };

  const submitUpdate = async () => {
    if (!selectedPrompt) return;

    const validationError = validatePromptText(formData.text);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      const trimmedText = formData.text.trim();
      const data: any = {
        text: trimmedText,
        category: formData.category
      };
      if (formData.fandom && formData.fandom.trim() !== '') {
        data.fandom = formData.fandom.trim();
      } else {
        data.fandom = null; // Clear fandom if empty
      }
      await updatePrompt(selectedPrompt._id, data);
      
      setIsEditModalOpen(false);
      setSelectedPrompt(null);
      setFormData({ text: '', category: 'General', fandom: undefined });
      fetchPrompts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update prompt');
    }
  };

  const confirmDelete = async () => {
    if (!selectedPrompt) return;
    
    try {
      await deletePrompt(selectedPrompt._id);
      setIsDeleteDialogOpen(false);
      setSelectedPrompt(null);
      fetchPrompts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete prompt');
    }
  };

  const getRandomPrompt = () => {
    if (prompts.length === 0) return;
    const random = prompts[Math.floor(Math.random() * prompts.length)];
    alert(`Random Prompt: ${random.text}\nCategory: ${random.category}`);
  };

  const columns = [
    {
      key: 'text',
      label: 'Prompt',
      render: (prompt: Prompt) => (
        <div>
          <strong>{prompt.text}</strong>
          <div style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
            Category: {prompt.category}
            {prompt.fandom && <span> • Fandom: <strong style={{ color: 'var(--color-primary)' }}>{prompt.fandom}</strong></span>}
            <span> • ID: {prompt._id.substring(0, 8)}...</span>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true
    },
    {
      key: 'fandom',
      label: 'Fandom',
      render: (prompt: Prompt) => prompt.fandom ? (
        <span style={{ 
          display: 'inline-block',
          padding: '4px 8px',
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          borderRadius: '4px',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          {prompt.fandom}
        </span>
      ) : (
        <span style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>None</span>
      ),
      sortable: true
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (prompt: Prompt) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {userId === prompt.createdById && (
            <button
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(prompt);
              }}
              style={{ 
                padding: '4px 8px', 
                fontSize: '0.875rem',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                color: 'white'
              }}
              title="Edit Prompt"
            >
              <i className="fas fa-edit"></i> Edit
            </button>
          )}
          {userId === prompt.createdById && (
            <button
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(prompt);
              }}
              style={{ 
                padding: '4px 8px', 
                fontSize: '0.875rem',
                background: 'linear-gradient(135deg, var(--color-error) 0%, var(--color-error-light) 100%)',
                color: 'white'
              }}
              title="Delete Prompt"
            >
              <i className="fas fa-trash"></i> Delete
            </button>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="prompt-manager-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="prompt-manager-page">
      <div className="prompt-manager-header">
        <h1>Prompt Manager</h1>
        <div className="prompt-manager-actions">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="prompt-manager-filter"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={fandomFilter}
            onChange={(e) => setFandomFilter(e.target.value)}
            className="prompt-manager-filter"
          >
            <option value="all">All Fandoms</option>
            <option value="none">No Fandom</option>
            {fandoms.map(f => (
              <option key={f.fandom} value={f.fandom}>{f.fandom}</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={getRandomPrompt} disabled={prompts.length === 0}>
            <i className="fas fa-random"></i> Random
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            <i className="fas fa-plus"></i> Create Prompt
          </button>
        </div>
      </div>

      {error && (
        <div className="prompt-manager-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>Create and manage roleplay prompts for your server. Prompts should be scenario-based and OC-neutral (avoid assuming character actions). Organize prompts by category (General, RP, Worldbuilding, Misc) and use <strong>Random</strong> to get a random prompt.</span>
      </p>

      {prompts.length === 0 ? (
        <EmptyState
          icon="fa-lightbulb"
          title="No Prompts Found"
          message="Create your first prompt to get started!"
          action={{ label: 'Create Prompt', onClick: handleCreate }}
        />
      ) : (
        <DataTable
          data={prompts}
          columns={columns}
          keyExtractor={(prompt) => prompt._id}
          searchable
          searchPlaceholder="Search prompts..."
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null); // Clear errors when closing modal
        }}
        title="Create New Prompt"
        size="lg"
        footer={
          <>
            <button 
              type="button"
              className="btn-secondary" 
              onClick={() => {
                setIsCreateModalOpen(false);
                setError(null);
              }}
            >
              Cancel
            </button>
            <button 
              type="button"
              className="btn-primary" 
              onClick={submitCreate}
            >
              Create
            </button>
          </>
        }
      >
        {error && (
          <div className="prompt-manager-error" style={{ marginBottom: 'var(--spacing-md)' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        <FormField
          label="Prompt Text"
          name="text"
          type="textarea"
          value={formData.text}
          onChange={(value) => setFormData({ ...formData, text: value })}
          placeholder="Enter prompt text (should be OC-neutral and scenario-based)"
          required
          rows={5}
        />
        <FormField
          label="Category"
          name="category"
          type="select"
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value as Prompt['category'] })}
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
          Prompts should be scenario-based and not assume character actions (avoid "your OC", "they", etc.). Select a fandom if this prompt is specific to a particular fandom.
        </p>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setError(null);
          setSelectedPrompt(null);
        }}
        title="Edit Prompt"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => {
              setIsEditModalOpen(false);
              setError(null);
              setSelectedPrompt(null);
            }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitUpdate}>
              Update
            </button>
          </>
        }
      >
        <FormField
          label="Prompt Text"
          name="text"
          type="textarea"
          value={formData.text}
          onChange={(value) => setFormData({ ...formData, text: value })}
          placeholder="Enter prompt text (should be OC-neutral and scenario-based)"
          required
          rows={5}
        />
        <FormField
          label="Category"
          name="category"
          type="select"
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value as Prompt['category'] })}
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
          Prompts should be scenario-based and not assume character actions (avoid "your OC", "they", etc.). Select a fandom if this prompt is specific to a particular fandom.
        </p>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Prompt"
        message={`Are you sure you want to delete this prompt? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        variant="danger"
      />
    </div>
  );
}
