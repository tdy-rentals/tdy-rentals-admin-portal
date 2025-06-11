import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import V3Parser from '../utils/parsers/V3Parser';

interface CreateClientFromFileProps {
  onClientCreated?: (clientData: any) => void;
  onCancel?: () => void;
}

type FileVersion = 'V3';

const CreateClientFromFile: React.FC<CreateClientFromFileProps> = ({
  onClientCreated,
  onCancel
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'parsing' | 'review'>('upload');
  const [parsedData, setParsedData] = useState<any>(null);
  const [selectedVersion, setSelectedVersion] = useState<FileVersion>('V3');
  const navigate = useNavigate();

  const handleFileProcessed = (clientData: any) => {
    setIsProcessing(false);
    setParsedData(clientData);
    setStep('review');
  };

  const handleFileUploadStarted = () => {
    setIsProcessing(true);
    setStep('parsing');
  };

  const handleConfirmCreate = () => {
    setIsProcessing(true);
    
    // Store client data temporarily in localStorage
    // TODO: Replace with Firestore save
    localStorage.setItem('currentClient', JSON.stringify(parsedData));
    
    // Generate a simple client ID (in real app, this would come from Firestore)
    const clientId = parsedData.clientNumber || `client-${Date.now()}`;
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      onClientCreated?.(parsedData);
      
      // Navigate to client page
      navigate(`/client/${clientId}`);
    }, 1000);
  };

  const handleBack = () => {
    if (step === 'review') {
      setStep('upload');
      setParsedData(null);
    }
  };

  const renderParser = () => {
    switch (selectedVersion) {
      case 'V3':
        return <V3Parser onClientParsed={handleFileProcessed} onFileUploadStarted={handleFileUploadStarted} />;
      default:
        return <V3Parser onClientParsed={handleFileProcessed} onFileUploadStarted={handleFileUploadStarted} />;
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '2rem',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0 }}>Create Client from File</h2>
        {onCancel && !isProcessing && (
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        )}
      </div>

      {step === 'upload' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#333'
            }}>
              What kind of file is this?
            </label>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value as FileVersion)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="V3">V3 - Version 3 Format</option>
            </select>
          </div>

          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Upload an Excel file (.xlsx) containing client data from your Google Sheets export:
          </p>
          
          {renderParser()}
        </div>
      )}

      {step === 'parsing' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '3rem 1rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
            Parsing Client Data...
          </h3>
          <p style={{ color: '#666', margin: 0 }}>
            Extracting information from your {selectedVersion} file
          </p>
          
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}

      {step === 'review' && parsedData && (
        <div>
          <h3>Review Client Data</h3>
          <p style={{ color: '#666', marginBottom: '0.5rem' }}>
            Parsed using <strong>{selectedVersion}</strong> format. Please review the client information below:
          </p>
          
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            <pre style={{ 
              margin: 0, 
              fontSize: '0.875rem',
              lineHeight: '1.4'
            }}>
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleBack}
              disabled={isProcessing}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isProcessing ? '#ccc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              Back
            </button>
            <button
              onClick={handleConfirmCreate}
              disabled={isProcessing}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isProcessing ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? 'Creating Client...' : 'Create Client & View Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateClientFromFile; 