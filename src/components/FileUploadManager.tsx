import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../contexts/ClientsContext';
import { bulkImportTransactions } from '../utils/transactionHelpers';
import type { ParsedTransaction } from '../utils/transactionHelpers';
import { parseAccountingFile } from '../utils/parseAccountingFile';

type FileType = 'V2' | 'V3' | 'V4' | 'MasterAccounting';

interface FileUploadManagerProps {
  onClose: () => void;
}

interface FileState {
  file: File | null;
  error: string | null;
  parsedData: {
    clientData: any;
    transactions: ParsedTransaction[];
  } | null;
}

const fileTypes: FileType[] = ['V2', 'V3', 'V4', 'MasterAccounting'];

const FileUploadManager: React.FC<FileUploadManagerProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { upsertClient } = useClients();
  const [fileStates, setFileStates] = useState<Record<FileType, FileState>>({
    V2: { file: null, error: null, parsedData: null },
    V3: { file: null, error: null, parsedData: null },
    V4: { file: null, error: null, parsedData: null },
    MasterAccounting: { file: null, error: null, parsedData: null },
  });
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleFileChange = (type: FileType) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileStates((prev) => ({
      ...prev,
      [type]: { file, error: null, parsedData: null },
    }));
    if (!file) return;
    setIsUploading(true);
    try {
      const parsedData = await parseAccountingFile(file);
      setFileStates((prev) => ({
        ...prev,
        [type]: { file, error: null, parsedData },
      }));
    } catch (err) {
      setFileStates((prev) => ({
        ...prev,
        [type]: { file, error: err instanceof Error ? err.message : 'Failed to parse file', parsedData: null },
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessFiles = async () => {
    setIsUploading(true);
    setGlobalError(null);
    try {
      // Collect all parsed client data and transactions
      const allParsed = fileTypes
        .map((type) => fileStates[type].parsedData)
        .filter(Boolean) as { clientData: any; transactions: ParsedTransaction[] }[];
      if (allParsed.length === 0) {
        setGlobalError('Please upload at least one file.');
        setIsUploading(false);
        return;
      }
      // Merge client data (use the first one as base, override with others)
      let mergedClientData = { ...allParsed[0].clientData };
      for (let i = 1; i < allParsed.length; i++) {
        mergedClientData = { ...mergedClientData, ...allParsed[i].clientData };
      }
      // Merge all transactions
      const mergedTransactions = allParsed.flatMap((d) => d.transactions);
      // Upsert client and import transactions
      await upsertClient(mergedClientData);
      await bulkImportTransactions(mergedClientData.clientId, mergedTransactions);
      navigate(`/client/${mergedClientData.clientId}`);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setIsUploading(false);
    }
  };

  const atLeastOneFile = fileTypes.some((type) => !!fileStates[type].file);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 600 }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: 24,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <h2>Upload Client Data Files</h2>
        <div style={{ marginBottom: 20 }}>
          {fileTypes.map((type) => (
            <div key={type} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>
                {type} File:
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange(type)}
                disabled={isUploading}
              />
              {fileStates[type].file && (
                <span style={{ marginLeft: 8 }}>
                  {fileStates[type].file.name}
                </span>
              )}
              {fileStates[type].error && (
                <div style={{ color: '#c33', fontSize: 12 }}>
                  {fileStates[type].error}
                </div>
              )}
            </div>
          ))}
        </div>
        {isUploading && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <div
              className="spinner"
              style={{
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #007bff',
                borderRadius: '50%',
                width: 30,
                height: 30,
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }}
            />
            <p>Processing...</p>
          </div>
        )}
        {globalError && (
          <div
            style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: 12,
              borderRadius: 4,
              marginBottom: 20,
            }}
          >
            {globalError}
          </div>
        )}
        <button
          onClick={handleProcessFiles}
          disabled={!atLeastOneFile || isUploading}
          style={{
            backgroundColor: atLeastOneFile && !isUploading ? '#28a745' : '#ccc',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: 4,
            cursor: atLeastOneFile && !isUploading ? 'pointer' : 'not-allowed',
            marginTop: 12,
          }}
        >
          Process Files
        </button>
      </div>
    </div>
  );
};

export default FileUploadManager; 