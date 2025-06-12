import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface Transaction {
  transactionId: string;
  clientId: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  date: string;
  description: string;
  status: 'pending' | 'validated' | 'rejected';
  createdBy: string;
  validatedBy: string | null;
  paymentMethod: string | null;
  createdAt: any;
  updatedAt: any;
}

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'transactionId' | 'createdAt' | 'updatedAt' | 'validatedBy'>) => Promise<void>;
  updateTransactionStatus: (transactionId: string, newStatus: 'pending' | 'validated' | 'rejected') => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
};

export const TransactionsProvider: React.FC<{ clientId: string; children: React.ReactNode }> = ({ clientId, children }) => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('clientId', '==', clientId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        transactionId: docSnap.id,
        ...docSnap.data()
      })) as Transaction[];
      setTransactions(data);
    });
    return unsubscribe;
  }, [clientId]);

  const addTransaction = async (transaction: Omit<Transaction, 'transactionId' | 'createdAt' | 'updatedAt' | 'validatedBy'>) => {
    if (!currentUser?.uid) return;
    await addDoc(collection(db, 'transactions'), {
      ...transaction,
      validatedBy: null,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const updateTransactionStatus = async (transactionId: string, newStatus: 'pending' | 'validated' | 'rejected') => {
    if (!currentUser?.uid) return;
    const transactionRef = doc(db, 'transactions', transactionId);
    await updateDoc(transactionRef, {
      status: newStatus,
      validatedBy: currentUser.uid,
      updatedAt: serverTimestamp()
    });
  };

  const value = {
    transactions,
    addTransaction,
    updateTransactionStatus
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
};
