import { useState, useEffect } from 'react';
import { GUILD_ID } from '../constants';
import { getPrompts, createPrompt, updatePrompt, deletePrompt, getFandoms, getUsers, getPromptAnswers } from '../services/api';
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
  id?: string; // Custom ID in format P12345
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
  color?: string;
}

const CATEGORIES = ['General', 'RP', 'Worldbuilding', 'Misc'] as const;

export default function PromptManager() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAnswersModalOpen, setIsAnswersModalOpen] = useState(false);
  
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptAnswers, setPromptAnswers] = useState<any[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answerCounts, setAnswerCounts] = useState<Map<string, number>>(new Map());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fandomFilter, setFandomFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [creatorsMap, setCreatorsMap] = useState<Map<string, string>>(new Map());
  
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
  }, [categoryFilter, fandomFilter, ownerFilter]);

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

  const fetchOwners = async () => {
    try {
      // Fetch all prompts to get unique owners
      const response = await getPrompts(GUILD_ID);
      const uniqueOwnerIds = [...new Set(response.data.map((p: Prompt) => p.createdById))] as string[];
      
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
      const createdById = ownerFilter === 'all' ? undefined : ownerFilter;
      const response = await getPrompts(GUILD_ID, category, fandom, createdById);
      let filteredPrompts = response.data;
      // If filtering for "none", filter out prompts that have a fandom
      if (fandomFilter === 'none') {
        filteredPrompts = filteredPrompts.filter((p: Prompt) => !p.fandom || p.fandom.trim() === '');
      }
      setPrompts(filteredPrompts);
      
      // Fetch owners if not already fetched
      if (owners.length === 0) {
        fetchOwners();
      }
      
      // Fetch creator names
      const creatorIds = [...new Set(filteredPrompts.map((p: Prompt) => p.createdById))];
      if (creatorIds.length > 0) {
        getUsers(creatorIds, GUILD_ID).then(response => {
          const newMap = new Map<string, string>();
          response.data.forEach((user: any) => {
            newMap.set(user.id, user.globalName || user.username);
          });
          setCreatorsMap(newMap);
        }).catch(() => {});
      }

      // Fetch answer counts for all prompts
      const answerCountPromises = filteredPrompts.map(async (p: Prompt) => {
        try {
          const answersResponse = await getPromptAnswers(GUILD_ID, p._id);
          const answers = Array.isArray(answersResponse.data) ? answersResponse.data : [];
          return { promptId: p._id, count: answers.length };
        } catch {
          return { promptId: p._id, count: 0 };
        }
      });
      const counts = await Promise.all(answerCountPromises);
      const countMap = new Map<string, number>();
      counts.forEach(({ promptId, count }) => {
        countMap.set(promptId, count);
      });
      setAnswerCounts(countMap);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ text: '', category: 'General', fandom: undefined });
    setError(null); // Clear any previous errors when opening modal
    setIsSubmitting(false); // Reset submitting state
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
    
    return null;
  };

  const submitCreate = async () => {
    const validationError = validatePromptText(formData.text);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isSubmitting) return; // Prevent double submission

    try {
      setIsSubmitting(true);
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
      
      console.log('Creating prompt with data:', data);
      const response = await createPrompt(data);
      console.log('Prompt created successfully:', response.data);
      
      // Close modal and reset form on success
      setIsCreateModalOpen(false);
      setFormData({ text: '', category: 'General', fandom: undefined });
      setError(null); // Clear any errors
      fetchPrompts();
    } catch (err: any) {
      console.error('Error creating prompt:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create prompt';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
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

  const getFandomColor = (fandomName: string | undefined): string | undefined => {
    if (!fandomName) return undefined;
    const fandom = fandoms.find(f => f.fandom === fandomName);
    return fandom?.color;
  };

  const handleViewAnswers = async (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setAnswersLoading(true);
    setIsAnswersModalOpen(true);
    try {
      const response = await getPromptAnswers(GUILD_ID, prompt._id);
      setPromptAnswers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch responses');
      setPromptAnswers([]);
    } finally {
      setAnswersLoading(false);
    }
  };

  const columns = [
    {
      key: 'text',
      label: 'Prompt',
      render: (prompt: Prompt) => {
        const displayId = prompt.id || `P${prompt._id.substring(0, 4).toUpperCase()}`;
        const fandomColor = getFandomColor(prompt.fandom);
        const creatorName = creatorsMap.get(prompt.createdById) || 'Unknown';
        return (
          <div>
            <strong>{prompt.text}</strong>
            <div style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
              Category: {prompt.category}
              {prompt.fandom && <span> • Fandom: <strong style={{ color: fandomColor || 'var(--color-primary)' }}>{prompt.fandom}</strong></span>}
              <span> • Created by {creatorName} • ID: <span style={{ backgroundColor: 'var(--color-bg)', padding: '2px 6px', borderRadius: '4px' }}>{displayId}</span></span>
              {answerCounts.get(prompt._id) !== undefined && answerCounts.get(prompt._id)! > 0 && (
                <span> • <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAnswers(prompt);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    fontSize: '0.875rem'
                  }}
                >
                  {answerCounts.get(prompt._id)} response{answerCounts.get(prompt._id)! !== 1 ? 's' : ''}
                </button></span>
              )}
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
      render: (prompt: Prompt) => {
        const fandomColor = getFandomColor(prompt.fandom);
        return prompt.fandom ? (
          <span style={{ 
            display: 'inline-block',
            padding: '4px 8px',
            backgroundColor: fandomColor ? `${fandomColor}20` : 'var(--color-primary-light)',
            color: fandomColor || 'var(--color-primary-dark)',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: fandomColor ? `1px solid ${fandomColor}40` : 'none'
          }}>
            {prompt.fandom}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>None</span>
        );
      },
      sortable: true
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (prompt: Prompt) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleViewAnswers(prompt);
            }}
            style={{ padding: '4px 8px', fontSize: '0.875rem' }}
            title="View Responses"
          >
            <i className="fas fa-comments"></i> Responses ({answerCounts.get(prompt._id) || 0})
          </button>
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
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="prompt-manager-filter"
          >
            <option value="all">All Owners</option>
            {owners.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
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

      {error && !isCreateModalOpen && !isEditModalOpen && (
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </>
        }
      >
        {error && (
          <div className="prompt-manager-error" style={{ 
            marginBottom: 'var(--spacing-md)', 
            position: 'relative',
            zIndex: 1002,
            backgroundColor: 'rgba(255, 168, 168, 0.2)',
            border: '2px solid rgba(255, 168, 168, 0.8)',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--border-radius)'
          }}>
            <i className="fas fa-exclamation-circle"></i> <strong>Error:</strong> {error}
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

      {/* Answers Modal */}
      <Modal
        isOpen={isAnswersModalOpen}
        onClose={() => {
          setIsAnswersModalOpen(false);
          setSelectedPrompt(null);
          setPromptAnswers([]);
        }}
        title={selectedPrompt ? `Responses for Prompt: ${selectedPrompt.text.substring(0, 50)}${selectedPrompt.text.length > 50 ? '...' : ''}` : 'Prompt Responses'}
        size="lg"
        footer={
          <button className="btn-secondary" onClick={() => {
            setIsAnswersModalOpen(false);
            setSelectedPrompt(null);
            setPromptAnswers([]);
          }}>
            Close
          </button>
        }
      >
        {answersLoading ? (
          <LoadingSpinner size="md" />
        ) : promptAnswers.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>
            No responses yet for this prompt.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {promptAnswers.map((answer: any, index: number) => (
              <div
                key={answer._id || index}
                style={{
                  padding: 'var(--spacing-md)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: 'var(--color-bg-secondary)'
                }}
              >
                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                  <strong>{creatorsMap.get(answer.userId) || 'Unknown User'}</strong>
                  {answer.ocId && answer.ocId.name && (
                    <span style={{ color: 'var(--color-text-light)', marginLeft: 'var(--spacing-sm)' }}>
                      as <strong>{answer.ocId.name}</strong>
                    </span>
                  )}
                  <span style={{ color: 'var(--color-text-light)', marginLeft: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
                    • {new Date(answer.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {answer.response}
                </div>
              </div>
            ))}
          </div>
        )}
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
