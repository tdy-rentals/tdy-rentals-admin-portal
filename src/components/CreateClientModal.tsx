import React from 'react';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onCreateFromSheets: () => void;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onCreateNew,
  onCreateFromSheets
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        position: 'relative'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#666',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        <h2 style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.5rem',
          color: '#333'
        }}>
          Create Client
        </h2>

        <p style={{
          color: '#666',
          marginBottom: '2rem',
          lineHeight: '1.5'
        }}>
          Choose how you'd like to create a new client:
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <button
            onClick={onCreateNew}
            style={{
              padding: '1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Create a New Client
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              Start with a blank client profile form
            </div>
          </button>

          <button
            onClick={onCreateFromSheets}
            style={{
              padding: '1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e7e34'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Create from Existing Google Sheet/s
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              Import client data from your current Google Sheets
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateClientModal; 