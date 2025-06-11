import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ParsingManager from '../components/ParsingManager';

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

      <main>
        <ParsingManager onClientsUpdated={handleClientsUpdated} />
      </main>
    </div>
  );
};

export default Dashboard; 