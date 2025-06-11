import React, { useState, useMemo } from 'react';

// Payment status types
type PaymentStatus = 'Unsigned' | 'Signed' | 'Invoiced' | 'Paid' | 'Unpaid' | 'Dispute' | 'Lost';

// Payment entry interface
interface PaymentEntry {
  id: string;
  clientNumber: string;
  date: string; // YYYY-MM-DD format
  type: 'incoming' | 'outgoing';
  amount: number;
  status: PaymentStatus;
  description: string;
  expectedDate?: string; // For anticipated payments
  createdAt: string;
  updatedAt: string;
}

// Client interface (simplified version)
interface TimelineClient {
  clientNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface PaymentTimelineProps {
  clients: TimelineClient[];
}

const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ clients }) => {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState<Partial<PaymentEntry>>({});

  // Status color mapping
  const statusColors: Record<PaymentStatus, string> = {
    'Unsigned': '#6c757d',    // Gray
    'Signed': '#17a2b8',      // Cyan
    'Invoiced': '#ffc107',    // Yellow
    'Paid': '#28a745',        // Green
    'Unpaid': '#dc3545',      // Red
    'Dispute': '#fd7e14',     // Orange
    'Lost': '#6f42c1'         // Purple
  };

  // Generate date columns for the selected month
  const dateColumns = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.push(date);
    }
    return dates;
  }, [selectedMonth]);

  // Get payments for a specific client and date
  const getPaymentsForDate = (clientNumber: string, date: string): PaymentEntry[] => {
    return payments.filter(p => p.clientNumber === clientNumber && p.date === date);
  };

  // Add or update payment
  const savePayment = (payment: Partial<PaymentEntry>) => {
    if (!payment.clientNumber || !payment.date || !payment.type || !payment.status) return;

    const now = new Date().toISOString();
    const paymentEntry: PaymentEntry = {
      id: payment.id || `${payment.clientNumber}-${payment.date}-${Date.now()}`,
      clientNumber: payment.clientNumber,
      date: payment.date,
      type: payment.type,
      amount: payment.amount || 0,
      status: payment.status,
      description: payment.description || '',
      expectedDate: payment.expectedDate,
      createdAt: payment.createdAt || now,
      updatedAt: now
    };

    setPayments(prev => {
      const existing = prev.findIndex(p => p.id === paymentEntry.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = paymentEntry;
        return updated;
      } else {
        return [...prev, paymentEntry];
      }
    });

    setEditingCell(null);
    setNewPayment({});
  };

  // Delete payment
  const deletePayment = (paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  // Start editing a cell
  const startEditing = (clientNumber: string, date: string) => {
    const cellKey = `${clientNumber}-${date}`;
    setEditingCell(cellKey);
    
    // Pre-fill with existing payment if it exists
    const existingPayments = getPaymentsForDate(clientNumber, date);
    if (existingPayments.length > 0) {
      setNewPayment(existingPayments[0]);
    } else {
      setNewPayment({
        clientNumber,
        date,
        type: 'incoming',
        status: 'Unsigned',
        amount: 0
      });
    }
  };

  // Calculate totals
  const calculateTotals = (clientNumber: string) => {
    const clientPayments = payments.filter(p => p.clientNumber === clientNumber);
    const incoming = clientPayments
      .filter(p => p.type === 'incoming')
      .reduce((sum, p) => sum + p.amount, 0);
    const outgoing = clientPayments
      .filter(p => p.type === 'outgoing')
      .reduce((sum, p) => sum + p.amount, 0);
    return { incoming, outgoing, net: incoming - outgoing };
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date for display
  const formatDateHeader = (date: string) => {
    const d = new Date(date);
    return d.getDate().toString();
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Payment Timeline</h2>
      
      {/* Month Selector */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold' }}>Month:</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        
        <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#666' }}>
          {clients.length} clients • {payments.length} payments
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <strong>Status Legend:</strong>
        {(Object.keys(statusColors) as PaymentStatus[]).map(status => (
          <span
            key={status}
            style={{
              backgroundColor: statusColors[status],
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem'
            }}
          >
            {status}
          </span>
        ))}
      </div>

      {/* Payment Timeline Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '8px', 
                textAlign: 'left',
                position: 'sticky',
                left: 0,
                backgroundColor: '#f8f9fa',
                zIndex: 10,
                minWidth: '150px'
              }}>
                Client
              </th>
              <th style={{ 
                border: '1px solid #ddd', 
                padding: '8px', 
                textAlign: 'center',
                position: 'sticky',
                left: '150px',
                backgroundColor: '#f8f9fa',
                zIndex: 10,
                minWidth: '120px'
              }}>
                Totals
              </th>
              {dateColumns.map(date => (
                <th
                  key={date}
                  style={{
                    border: '1px solid #ddd',
                    padding: '4px',
                    textAlign: 'center',
                    minWidth: '60px',
                    fontSize: '0.85rem'
                  }}
                >
                  {formatDateHeader(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map(client => {
              const totals = calculateTotals(client.clientNumber);
              
              return (
                <tr key={client.clientNumber}>
                  {/* Client Info */}
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '8px',
                    position: 'sticky',
                    left: 0,
                    backgroundColor: 'white',
                    zIndex: 5
                  }}>
                    <div style={{ fontSize: '0.9rem' }}>
                      <strong>#{client.clientNumber}</strong><br/>
                      {client.firstName} {client.lastName}
                    </div>
                  </td>
                  
                  {/* Totals */}
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '4px',
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    position: 'sticky',
                    left: '150px',
                    backgroundColor: 'white',
                    zIndex: 5
                  }}>
                    <div style={{ color: '#28a745' }}>+{formatCurrency(totals.incoming)}</div>
                    <div style={{ color: '#dc3545' }}>-{formatCurrency(totals.outgoing)}</div>
                    <div style={{ 
                      fontWeight: 'bold',
                      color: totals.net >= 0 ? '#28a745' : '#dc3545',
                      borderTop: '1px solid #ddd',
                      paddingTop: '2px',
                      marginTop: '2px'
                    }}>
                      {formatCurrency(totals.net)}
                    </div>
                  </td>
                  
                  {/* Date Columns */}
                  {dateColumns.map(date => {
                    const cellKey = `${client.clientNumber}-${date}`;
                    const cellPayments = getPaymentsForDate(client.clientNumber, date);
                    const isEditing = editingCell === cellKey;
                    
                    return (
                      <td
                        key={date}
                        style={{
                          border: '1px solid #ddd',
                          padding: '2px',
                          textAlign: 'center',
                          minWidth: '60px',
                          height: '50px',
                          cursor: 'pointer',
                          backgroundColor: isEditing ? '#e3f2fd' : 'white'
                        }}
                        onClick={() => !isEditing && startEditing(client.clientNumber, date)}
                      >
                        {isEditing ? (
                          // Editing Form
                          <div style={{ 
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'white',
                            border: '2px solid #007bff',
                            borderRadius: '8px',
                            padding: '1rem',
                            minWidth: '300px',
                            zIndex: 20,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}>
                            <h5 style={{ margin: '0 0 1rem 0' }}>
                              Payment for {client.firstName} {client.lastName} - {date}
                            </h5>
                            
                            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                              <div>
                                <label>Type:</label>
                                <select
                                  value={newPayment.type || 'incoming'}
                                  onChange={(e) => setNewPayment(prev => ({ ...prev, type: e.target.value as 'incoming' | 'outgoing' }))}
                                  style={{ width: '100%', padding: '4px' }}
                                >
                                  <option value="incoming">Incoming</option>
                                  <option value="outgoing">Outgoing</option>
                                </select>
                              </div>
                              
                              <div>
                                <label>Status:</label>
                                <select
                                  value={newPayment.status || 'Unsigned'}
                                  onChange={(e) => setNewPayment(prev => ({ ...prev, status: e.target.value as PaymentStatus }))}
                                  style={{ width: '100%', padding: '4px' }}
                                >
                                  {(Object.keys(statusColors) as PaymentStatus[]).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label>Amount:</label>
                                <input
                                  type="number"
                                  value={newPayment.amount || ''}
                                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                  style={{ width: '100%', padding: '4px' }}
                                  placeholder="0.00"
                                />
                              </div>
                              
                              <div>
                                <label>Description:</label>
                                <input
                                  type="text"
                                  value={newPayment.description || ''}
                                  onChange={(e) => setNewPayment(prev => ({ ...prev, description: e.target.value }))}
                                  style={{ width: '100%', padding: '4px' }}
                                  placeholder="Payment description"
                                />
                              </div>
                              
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button
                                  onClick={() => savePayment(newPayment)}
                                  style={{
                                    padding: '4px 12px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCell(null);
                                    setNewPayment({});
                                  }}
                                  style={{
                                    padding: '4px 12px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancel
                                </button>
                                {newPayment.id && (
                                  <button
                                    onClick={() => {
                                      deletePayment(newPayment.id!);
                                      setEditingCell(null);
                                      setNewPayment({});
                                    }}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Display Payments
                          <div style={{ fontSize: '0.75rem' }}>
                            {cellPayments.map(payment => (
                              <div
                                key={payment.id}
                                style={{
                                  backgroundColor: statusColors[payment.status],
                                  color: 'white',
                                  padding: '1px 4px',
                                  margin: '1px 0',
                                  borderRadius: '3px',
                                  fontSize: '0.7rem'
                                }}
                                title={`${payment.type}: ${formatCurrency(payment.amount)} - ${payment.description}`}
                              >
                                {payment.type === 'incoming' ? '+' : '-'}{formatCurrency(payment.amount)}
                              </div>
                            ))}
                            {cellPayments.length === 0 && (
                              <div style={{ color: '#999', fontSize: '0.7rem' }}>+</div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentTimeline; 