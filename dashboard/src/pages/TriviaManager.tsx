import { useState, useEffect } from 'react';
import { getTrivia, createTrivia, deleteTrivia, getOCs } from '../services/api';
import { GUILD_ID } from '../constants';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './TriviaManager.css';

interface Trivia {
  _id: string;
  question: string;
  answer: string;
  category: 'OC Trivia' | 'Fandom Trivia' | 'Yume Trivia';
  guildId: string;
  createdById: string;
  ocId?: string;
  fandom?: string;
  createdAt: string;
}

const CATEGORIES = ['OC Trivia', 'Fandom Trivia', 'Yume Trivia'] as const;

export default function TriviaManager() {
  const [trivias, setTrivias] = useState<Trivia[]>([]);
  const [ocs, setOCs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedTrivia, setSelectedTrivia] = useState<Trivia | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'OC Trivia' as Trivia['category'],
    ocName: '',
    fandom: ''
  });

  useEffect(() => {
    fetchTrivia();
    fetchOCs();
  }, [categoryFilter]);

  const fetchTrivia = async () => {
    try {
      setLoading(true);
      setError(null);
      const category = categoryFilter === 'all' ? undefined : categoryFilter;
      const response = await getTrivia(GUILD_ID, category);
      setTrivias(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch trivia');
    } finally {
      setLoading(false);
    }
  };

  const fetchOCs = async () => {
    try {
      const response = await getOCs(GUILD_ID);
      setOCs(response.data);
    } catch (err: any) {
      // Silently fail - OCs are optional
    }
  };

  const handleCreate = () => {
    setFormData({
      question: '',
      answer: '',
      category: 'OC Trivia',
      ocName: '',
      fandom: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = (trivia: Trivia) => {
    setSelectedTrivia(trivia);
    setIsDeleteDialogOpen(true);
  };

  const submitCreate = async () => {
    try {
      let ocId: string | undefined;
      if (formData.category === 'OC Trivia' && formData.ocName) {
        const oc = ocs.find((o: any) => o.name.toLowerCase() === formData.ocName.toLowerCase());
        if (!oc) {
          setError(`OC "${formData.ocName}" not found!`);
          return;
        }
        ocId = oc._id;
      }

      await createTrivia({
        question: formData.question,
        answer: formData.answer,
        category: formData.category,
        guildId: GUILD_ID,
        ocId,
        fandom: formData.fandom || undefined
      });
      
      setIsCreateModalOpen(false);
      fetchTrivia();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create trivia');
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
      render: (trivia: Trivia) => (
        <div>
          <strong>{trivia.question}</strong>
          <div style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
            Answer: {trivia.answer} • Category: {trivia.category} • ID: {trivia._id.substring(0, 8)}...
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
      key: 'actions',
      label: 'Actions',
      render: (trivia: Trivia) => (
        <div style={{ display: 'flex', gap: '8px' }}>
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
        </div>
      )
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="trivia-manager-filter"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={handleCreate}>
            <i className="fas fa-plus"></i> Create Trivia
          </button>
        </div>
      </div>

      {error && (
        <div className="trivia-manager-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <p className="page-instructions">
        <i className="fas fa-info-circle"></i> Create and manage trivia questions for your server. Trivia can be categorized as OC Trivia, Fandom Trivia, or Yume Trivia. For OC Trivia, you can optionally link questions to specific OCs. Filter by category to find specific trivia questions.
      </p>

      {trivias.length === 0 ? (
        <EmptyState
          icon="fa-brain"
          title="No Trivia Found"
          message="Create your first trivia question to get started!"
          action={{ label: 'Create Trivia', onClick: handleCreate }}
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
        title="Create New Trivia"
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
          placeholder="Enter the trivia question"
          required
          rows={3}
        />
        <FormField
          label="Answer"
          name="answer"
          value={formData.answer}
          onChange={(value) => setFormData({ ...formData, answer: value })}
          placeholder="Enter the answer"
          required
        />
        <FormField
          label="Category"
          name="category"
          type="select"
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value as Trivia['category'], ocName: '', fandom: '' })}
          required
          options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
        />
        {formData.category === 'OC Trivia' && (
          <FormField
            label="OC Name"
            name="ocName"
            value={formData.ocName}
            onChange={(value) => setFormData({ ...formData, ocName: value })}
            placeholder="OC name (optional)"
          />
        )}
        {formData.category === 'Fandom Trivia' && (
          <FormField
            label="Fandom"
            name="fandom"
            value={formData.fandom}
            onChange={(value) => setFormData({ ...formData, fandom: value })}
            placeholder="Fandom name (optional)"
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Trivia"
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
