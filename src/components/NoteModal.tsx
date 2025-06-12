import React, { useState } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const getFirstName = (displayName: string | null | undefined, email: string | null | undefined) => {
    if (displayName) return displayName.split(' ')[0];
    if (email) return email.split('@')[0];
    return 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await addDoc(collection(db, 'admin_notes'), {
        title,
        message,
        location,
        imageUrl: '', // TODO: Implement image upload
        author: getFirstName(currentUser?.displayName, currentUser?.email),
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setTitle('');
      setMessage('');
      setLocation('');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError('Failed to submit note.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        <h2>Make a Note for Grace</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Title:
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
          </label>
          <label>
            Message:
            <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={4} />
          </label>
          <label>
            Image (optional):
            <input type="file" accept="image/*" disabled />
          </label>
          <label>
            Location (optional):
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Where on the page is this about?" />
          </label>
          <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Note'}</button>
          {success && <div style={{ color: 'green' }}>Note submitted!</div>}
          {error && <div style={{ color: 'red' }}>{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default NoteModal; 