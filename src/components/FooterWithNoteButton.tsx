import React, { useState } from 'react';
import NoteModal from './NoteModal';

const FooterWithNoteButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <footer style={{
      width: '100%',
      position: 'fixed',
      bottom: 0,
      left: 0,
      background: 'rgba(255,255,255,0.95)',
      borderTop: '1px solid #eee',
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1001
    }}>
      <button onClick={() => setIsModalOpen(true)} style={{ background: '#007bff', color: 'white', fontWeight: 600 }}>
        Make a Note for Grace
      </button>
      <NoteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </footer>
  );
};

export default FooterWithNoteButton; 