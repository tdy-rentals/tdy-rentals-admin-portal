import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCardsProvider, useCreditCards } from '../contexts/CreditCardsContext';
import AdjustCreditCardBalanceModal from '../components/AdjustCreditCardBalanceModal';
import ParsingManager from '../components/ParsingManager';
import CreateClientModal from '../components/CreateClientModal';
import CreateClientFromFile from '../components/CreateClientFromFile';

const RevenueExpensesPanel: React.FC = () => {
  const navigate = useNavigate();
  const { creditCards } = useCreditCards();
  const [adjustCardId, setAdjustCardId] = useState<string | null>(null);

  // Placeholder client list — you can replace this with Firestore 'clients' collection later
  const clients = [
    { clientId: 'client1', name: 'Acme Corp' },
    { clientId: 'client2', name: 'Beta LLC' }
  ];

  return (
    <div>
      <h2>Clients</h2>
      <table>
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(client => (
            <tr key={client.clientId}>
              <td>{client.name}</td>
              <td>
                <button onClick={() => navigate(`/client/${client.clientId}`)}>View Client</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Credit Cards</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Limit</th>
            <th>Current Balance</th>
            <th>Available Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {creditCards.map(card => (
            <tr key={card.cardId}>
              <td>{card.name}</td>
              <td>${card.limit.toFixed(2)}</td>
              <td>${card.currentBalance.toFixed(2)}</td>
              <td>${card.availableBalance.toFixed(2)}</td>
              <td>
                <button onClick={() => setAdjustCardId(card.cardId)}>Adjust Balance</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AdjustCreditCardBalanceModal
        cardId={adjustCardId || ''}
        isOpen={!!adjustCardId}
        onClose={() => setAdjustCardId(null)}
      />
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dataUpload' | 'revenueExpenses'>('dataUpload');

  return (
    <CreditCardsProvider>
      <div>
        <h1>Dashboard</h1>
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => setActiveTab('dataUpload')}>Data Upload / Parsing</button>
          <button onClick={() => setActiveTab('revenueExpenses')}>Revenue + Expenses</button>
        </div>

        {activeTab === 'dataUpload' && (
          <div>
            <h2>Data Upload / Parsing</h2>
            <ParsingManager />
            <CreateClientModal />
            <CreateClientFromFile />
          </div>
        )}

        {activeTab === 'revenueExpenses' && (
          <RevenueExpensesPanel />
        )}
      </div>
    </CreditCardsProvider>
  );
};

export default Dashboard;
