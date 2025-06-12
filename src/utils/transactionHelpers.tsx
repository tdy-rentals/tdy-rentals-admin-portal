import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
  } from 'firebase/firestore';
  import { db } from '../config/firebase';
  
  // Define the shape of your parsed transaction
  export interface ParsedTransaction {
    type: 'incoming' | 'outgoing';
    amount: number;
    date: string; // YYYY-MM-DD
    description: string;
    paymentMethod?: string | null; // outgoing only
  }
  
  const buildNaturalKey = (clientId: string, txn: ParsedTransaction): string => {
    return `${clientId}_${txn.type}_${txn.amount}_${txn.date}_${txn.description}`;
  };
  
  export const bulkImportTransactions = async (
    clientId: string,
    parsedTransactions: ParsedTransaction[]
  ) => {
    console.log(`Starting bulk import of ${parsedTransactions.length} transactions for client ${clientId}`);
  
    // Fetch existing transactions for this client
    const q = query(collection(db, 'transactions'), where('clientId', '==', clientId));
    const snapshot = await getDocs(q);
  
    // Build map of existing natural keys
    const existingTransactionsMap = new Map<string, { id: string; status: string }>();
  
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const naturalKey = buildNaturalKey(clientId, {
        type: data.type,
        amount: data.amount,
        date: data.date,
        description: data.description,
        paymentMethod: data.paymentMethod || null
      });
      existingTransactionsMap.set(naturalKey, {
        id: docSnap.id,
        status: data.status
      });
    });
  
    let importedCount = 0;
    let skippedCount = 0;
    let overwrittenCount = 0;
  
    for (const txn of parsedTransactions) {
      const naturalKey = buildNaturalKey(clientId, txn);
      const existing = existingTransactionsMap.get(naturalKey);
  
      if (existing) {
        if (existing.status === 'unverified') {
          // Overwrite unverified transaction
          const txnRef = doc(db, 'transactions', existing.id);
          await updateDoc(txnRef, {
            type: txn.type,
            amount: txn.amount,
            date: txn.date,
            description: txn.description,
            paymentMethod: txn.type === 'outgoing' ? txn.paymentMethod || null : null,
            status: 'unverified',
            updatedAt: serverTimestamp()
          });
          overwrittenCount++;
        } else {
          // Skip verified/rejected transactions
          skippedCount++;
        }
      } else {
        // New transaction → add
        await addDoc(collection(db, 'transactions'), {
          clientId,
          type: txn.type,
          amount: txn.amount,
          date: txn.date,
          description: txn.description,
          paymentMethod: txn.type === 'outgoing' ? txn.paymentMethod || null : null,
          status: 'unverified',
          createdBy: 'system-import', // or you can set currentUser?.uid if available
          validatedBy: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        importedCount++;
      }
    }
  
    console.log(
      `Import complete: ${importedCount} new, ${overwrittenCount} overwritten, ${skippedCount} skipped.`
    );
  };
  