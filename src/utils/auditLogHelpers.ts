import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Logs an audit entry to the auditLog collection.
 *
 * @param entityType 'client' | 'transaction' | 'creditCard' | 'other'
 * @param entityId ID of the entity being modified
 * @param action Name of the action performed
 * @param performedBy userId of who performed the action
 * @param details Arbitrary object with change details
 */
export const logAuditEntry = async (
  entityType: 'client' | 'transaction' | 'creditCard' | 'other',
  entityId: string,
  action: string,
  performedBy: string,
  details: any
) => {
  try {
    await addDoc(collection(db, 'auditLog'), {
      entityType,
      entityId,
      action,
      performedBy,
      details,
      timestamp: serverTimestamp()
    });
    console.log(`Audit log entry created for ${entityType} ${entityId}: ${action}`);
  } catch (error) {
    console.error('Error logging audit entry:', error);
  }
};
