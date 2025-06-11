import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ClientData {
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  tdyType: string;
  dealType: string;
  perDiemStartDate: string;
  perDiemEndDate: string;
  maxLodgingAllocation: number;
  liquidationTaxRate: number;
  referralSource: string;
  referralFeeType?: string;
}

const ClientPage: React.FC = () => {
  const { clientId: _clientId } = useParams();
  const navigate = useNavigate();
  const { currentUser: _currentUser, logout } = useAuth();

  // TODO: Fetch client data from Firestore using clientId
  // For now, we'll get it from localStorage (temporary)
  const clientData: ClientData | null = (() => {
    try {
      const stored = localStorage.getItem('currentClient');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (!clientData) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Client not found</h1>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <header style={{ 
        borderBottom: '1px solid #eee', 
        paddingBottom: '1rem', 
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0' }}>
            {clientData.firstName} {clientData.lastName}
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Client #{clientData.clientNumber}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Back to Dashboard
          </button>
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

      {/* Client Information Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Basic Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #eee'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Basic Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <strong>Name:</strong> {clientData.firstName} {clientData.lastName}
            </div>
            <div>
              <strong>Email:</strong> {clientData.email || 'Not provided'}
            </div>
            <div>
              <strong>Client Number:</strong> {clientData.clientNumber}
            </div>
          </div>
        </div>

        {/* TDY Details */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #eee'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>TDY Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <strong>TDY Type:</strong> {clientData.tdyType || 'Not specified'}
            </div>
            <div>
              <strong>Deal Type:</strong> {clientData.dealType || 'Not specified'}
            </div>
            <div>
              <strong>Start Date:</strong> {formatDate(clientData.perDiemStartDate)}
            </div>
            <div>
              <strong>End Date:</strong> {formatDate(clientData.perDiemEndDate)}
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #eee'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Financial Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <strong>Max Lodging Allocation:</strong> {formatCurrency(clientData.maxLodgingAllocation)}
            </div>
            <div>
              <strong>Liquidation Tax Rate:</strong> {clientData.liquidationTaxRate || 0}%
            </div>
            <div>
              <strong>Referral Source:</strong> {clientData.referralSource || 'None'}
            </div>
            {clientData.referralFeeType && (
              <div>
                <strong>Referral Type:</strong> {clientData.referralFeeType}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPage; 