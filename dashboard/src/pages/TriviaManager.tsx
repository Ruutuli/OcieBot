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
  guildId: string;
  createdById: string;
  ocId: string | { _id: string; name: string };
  createdAt: string;
}

export default function TriviaManager() {
  const [trivias, setTrivias] = useState<Trivia[]>([]);
  const [ocs, setOCs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedTrivia, setSelectedTrivia] = useState<Trivia | null>(null);
  
  const [formData, setFormData] = useState({
    question: '',
    ocName: ''
  });

  useEffect(() => {
    fetchTrivia();
    fetchOCs();
  }, []);

  const fetchTrivia = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTrivia(GUILD_ID);
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
      ocName: ''
    });
    setIsCreateModalOpen(true);
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

      const oc = ocs.find((o: any) => o.name.toLowerCase() === formData.ocName.toLowerCase());
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
      render: (trivia: Trivia) => {
        const oc = typeof trivia.ocId === 'object' ? trivia.ocId.name : 'Unknown OC';
        const triviaId = `T${trivia._id.substring(0, 4).toUpperCase()}`;
        return (
          <div>
            <strong>{trivia.question}</strong>
            <div style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
              Answer: {oc} • ID: {triviaId}
            </div>
          </div>
        );
      }
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
        <i className="fas fa-info-circle"></i> Create and manage trivia questions about OCs. Each question is tied to a specific OC (the answer). Users can play trivia by ID using <code>/trivia play</code> and answer with <code>/trivia answer</code>.
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
          value={formData.ocName}
          onChange={(value) => setFormData({ ...formData, ocName: value })}
          placeholder="The OC this question is about (the answer)"
          required
        />
        {ocs.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
            Available OCs: {ocs.map((oc: any) => oc.name).join(', ')}
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
