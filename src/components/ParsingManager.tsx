import React, { useState } from 'react';
import { useClients } from '../contexts/ClientsContext';
import { bulkImportTransactions } from '../utils/transactionHelpers';
import type { ParsedTransaction } from '../utils/transactionHelpers';
import { parseAccountingFile } from '../utils/parseAccountingFile';

// Example ClientData type — adjust as needed to match your parser output
interface ParsedClientData {
  clientId: string;
  name: string;
  address?: string;
  contactEmail?: string;
}

const ParsingManager: React.FC = () => {
  const { upsertClient } = useClients();

  // Example parsed data state — replace with your actual parsing logic
  const [parsedClientData, setParsedClientData] = useState<ParsedClientData | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { clientData, transactions } = await parseAccountingFile(file);

    setParsedClientData(clientData);
    setParsedTransactions(transactions);

    console.log('Parsed Client:', clientData);
    console.log('Parsed Transactions:', transactions);
  };


  const handleLoadClient = async () => {
    if (!parsedClientData) return;
    try {
      await upsertClient(parsedClientData);
      alert('Client loaded to Firestore successfully!');
    } catch (error) {
      console.error('Error loading client:', error);
      alert('Error loading client. Check console.');
    }
  };

  const handleLoadTransactions = async () => {
    if (!parsedClientData || !parsedTransactions.length) return;
    try {
      await bulkImportTransactions(parsedClientData.clientId, parsedTransactions);
      alert('Transactions loaded to Firestore successfully!');
    } catch (error) {
      console.error('Error loading transactions:', error);
      alert('Error loading transactions. Check console.');
    }
  };

  return (
    <div>
      <h2>Parsing Manager</h2>
      <input type="file" onChange={handleFileUpload} />

      {parsedClientData && (
        <div style={{ marginTop: '16px' }}>
          <h3>Parsed Client Data</h3>
          <pre>{JSON.stringify(parsedClientData, null, 2)}</pre>
          <button onClick={handleLoadClient}>Load Client to Firestore</button>
        </div>
      )}

      {parsedTransactions.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h3>Parsed Transactions</h3>
          <pre>{JSON.stringify(parsedTransactions, null, 2)}</pre>
          <button onClick={handleLoadTransactions}>Load Transactions to Firestore</button>
        </div>
      )}
    </div>
  );
};

export default ParsingManager;
