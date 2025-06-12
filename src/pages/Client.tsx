import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TransactionsProvider, useTransactions } from '../contexts/TransactionsContext';
import AddTransactionModal from '../components/AddTransactionModal';
import PaymentTimeline from '../components/PaymentTimeline';
import { useClients } from '../contexts/ClientsContext';
import VerifiedFieldsManager from '../components/VerifiedFieldsManager';
import FooterWithNoteButton from '../components/FooterWithNoteButton';

const ClientPageContent: React.FC<{ clientId: string }> = ({ clientId }) => {
  const { transactions, updateTransactionStatus } = useTransactions();
  const { clients } = useClients();
  const client = clients.find((c) => c.clientId === clientId);

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'combined'>('combined');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredTransactions = transactions.filter((txn) => {
    if (activeTab === 'combined') return true;
    return txn.type === activeTab;
  });

  const handleStatusChange = async (txnId: string, newStatus: 'pending' | 'validated' | 'rejected') => {
    await updateTransactionStatus(txnId, newStatus);
  };

  const totalIncoming = transactions
    .filter((t) => t.type === 'incoming' && t.status === 'validated')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutgoing = transactions
    .filter((t) => t.type === 'outgoing' && t.status === 'validated')
    .reduce((sum, t) => sum + t.amount, 0);

  const netTotal = totalIncoming - totalOutgoing;

  return (
    <div>
      <h1>Client: {clientId}</h1>

      {client ? (
        <div style={{ border: '1px solid #ccc', padding: '12px', marginBottom: '16px' }}>
          <h2>Client Info</h2>
          <p><strong>Name:</strong> {client.name}</p>
          <p><strong>Address:</strong> {client.address || '-'}</p>
          <p><strong>Contact Email:</strong> {client.contactEmail || '-'}</p>
          <p><strong>Verified Fields:</strong> {client.verifiedFields.join(', ') || '-'}</p>

          <VerifiedFieldsManager client={client} />
        </div>
      ) : (
        <p>Loading client info...</p>
      )}

      <div>
        <button onClick={() => setActiveTab('incoming')}>Incoming</button>
        <button onClick={() => setActiveTab('outgoing')}>Outgoing</button>
        <button onClick={() => setActiveTab('combined')}>Combined</button>
        <button onClick={() => setIsModalOpen(true)}>Add Transaction</button>
      </div>

      <h3>Net Total (validated): ${netTotal.toFixed(2)}</h3>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Payment Method</th>
            <th>Status</th>
            <th>Created By</th>
            <th>Validated By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map((txn) => (
            <tr key={txn.transactionId}>
              <td>{txn.date}</td>
              <td>{txn.type}</td>
              <td>${txn.amount.toFixed(2)}</td>
              <td>{txn.description}</td>
              <td>{txn.paymentMethod || '-'}</td>
              <td>{txn.status}</td>
              <td>{txn.createdBy}</td>
              <td>{txn.validatedBy || '-'}</td>
              <td>
                {txn.status !== 'validated' && (
                  <button onClick={() => handleStatusChange(txn.transactionId, 'validated')}>Validate</button>
                )}
                {txn.status !== 'rejected' && (
                  <button onClick={() => handleStatusChange(txn.transactionId, 'rejected')}>Reject</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Payment Timeline (validated only)</h3>
      <PaymentTimeline clients={[{ clientNumber: clientId, firstName: client?.name || '', lastName: '' }]} />

      <AddTransactionModal clientId={clientId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

const Client: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) return <div>No client selected.</div>;

  return (
    <TransactionsProvider clientId={clientId}>
      <ClientPageContent clientId={clientId} />
      <FooterWithNoteButton />
    </TransactionsProvider>
  );
};

export default Client;
