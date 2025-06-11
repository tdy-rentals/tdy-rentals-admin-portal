import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ParsingManager from '../components/ParsingManager';
import PaymentTimeline from '../components/PaymentTimeline';

// Client interface (matching the one from ParsingManager)
interface Client {
  isInV2: boolean;
  isInV3: boolean;
  isInV4: boolean;
  isInMasterAccounting: boolean;
  
  V2?: any;
  V3?: any; 
  V4?: any;
  master_accounting?: any;
  
  clientNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  govEmail?: string;
  cell?: string;
  tdyLocation?: string;
  govAgencyOrDept?: string;
  tdyType?: string;
  dealType?: string;
  contractStatus?: string;
  hasRoommates?: boolean;
  totalRoommates?: number;
  perDiemStartDate?: string;
  perDiemEndDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  maxLodgingAllocation?: number;
  liquidationTaxRate?: number;
  referralSource?: string;
  referralFeeType?: string;
  salesRep?: string;
  lodgingTaxExempt?: boolean;
  lodgingTaxReimbursable?: boolean;
  taxCalculationMethod?: string;
  clientWorksheetUrl?: string;
  numberOfNights?: number;
  
  createdAt: string;
  updatedAt: string;
}

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<'parsing' | 'timeline'>('parsing');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleClientsUpdated = (updatedClients: Client[]) => {
    setClients(updatedClients);
    console.log(`Updated client list: ${updatedClients.length} clients`);
  };

  // Convert clients to timeline format
  const timelineClients = clients.map(client => ({
    clientNumber: client.clientNumber,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email
  }));

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ 
        borderBottom: '1px solid #eee', 
        paddingBottom: '1rem', 
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1>TDY Rentals Admin Dashboard</h1>
          <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
            Welcome, {currentUser?.displayName || currentUser?.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {clients.length > 0 && `${clients.length} clients loaded`}
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #eee' }}>
          <button
            onClick={() => setActiveTab('parsing')}
            style={{
              padding: '1rem 2rem',
              backgroundColor: activeTab === 'parsing' ? '#007bff' : 'transparent',
              color: activeTab === 'parsing' ? 'white' : '#007bff',
              border: 'none',
              borderBottom: activeTab === 'parsing' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            File Parsing & Clients
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '1rem 2rem',
              backgroundColor: activeTab === 'timeline' ? '#007bff' : 'transparent',
              color: activeTab === 'timeline' ? 'white' : '#007bff',
              border: 'none',
              borderBottom: activeTab === 'timeline' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Payment Timeline
          </button>
        </div>
      </div>

      <main>
        {activeTab === 'parsing' && (
          <ParsingManager onClientsUpdated={handleClientsUpdated} />
        )}
        
        {activeTab === 'timeline' && (
          <>
            {clients.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h3 style={{ color: '#6c757d', marginBottom: '1rem' }}>No Clients Available</h3>
                <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
                  Please upload and compile client files in the "File Parsing & Clients" tab first.
                </p>
                <button
                  onClick={() => setActiveTab('parsing')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Go to File Parsing
                </button>
              </div>
            ) : (
              <PaymentTimeline clients={timelineClients} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard; 