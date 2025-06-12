import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Client } from '../contexts/ClientsContext';
import { logAuditEntry } from '../utils/auditLogHelpers';
import { useAuth } from '../contexts/AuthContext';

interface VerifiedFieldsManagerProps {
  client: Client;
}

const POSSIBLE_FIELDS = ['name', 'address', 'contactEmail'];

const VerifiedFieldsManager: React.FC<VerifiedFieldsManagerProps> = ({ client }) => {
  const { currentUser } = useAuth();
  const [verifiedFields, setVerifiedFields] = useState<string[]>(client.verifiedFields || []);
  const [saving, setSaving] = useState(false);

  const handleToggleField = (field: string) => {
    setVerifiedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const clientRef = doc(db, 'clients', client.clientId);
      await updateDoc(clientRef, {
        verifiedFields
      });

      // Log audit entry
      await logAuditEntry(
        'client',
        client.clientId,
        'verifiedFieldsUpdated',
        currentUser?.uid || 'unknown',
        { verifiedFields }
      );

      alert('Verified fields updated!');
    } catch (error) {
      console.error('Error updating verified fields:', error);
      alert('Error updating verified fields. Check console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '12px', marginTop: '16px' }}>
      <h3>Verified Fields Manager</h3>
      {POSSIBLE_FIELDS.map((field) => (
        <div key={field}>
          <label>
            <input
              type="checkbox"
              checked={verifiedFields.includes(field)}
              onChange={() => handleToggleField(field)}
            />
            {' '}
            {field}
          </label>
        </div>
      ))}
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Verified Fields'}
      </button>
    </div>
  );
};

export default VerifiedFieldsManager;
