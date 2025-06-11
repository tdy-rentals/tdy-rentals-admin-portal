import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
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
      </header>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #eee'
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Active Clients</h3>
          <p style={{ color: '#666', margin: 0 }}>Client management coming soon...</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #eee'
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Recent Tasks</h3>
          <p style={{ color: '#666', margin: 0 }}>Task management coming soon...</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #eee'
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Reports</h3>
          <p style={{ color: '#666', margin: 0 }}>Reporting dashboard coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 