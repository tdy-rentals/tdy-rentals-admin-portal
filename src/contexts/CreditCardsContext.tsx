import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface CreditCard {
  cardId: string;
  name: string;
  limit: number;
  currentBalance: number;
  availableBalance: number;
  lastUpdated: any;
}

interface CreditCardsContextType {
  creditCards: CreditCard[];
  adjustCreditCardBalance: (cardId: string, newBalance: number, reason: string, relatedTransactionId?: string | null) => Promise<void>;
}

const CreditCardsContext = createContext<CreditCardsContextType | undefined>(undefined);

export const useCreditCards = () => {
  const context = useContext(CreditCardsContext);
  if (!context) {
    throw new Error('useCreditCards must be used within a CreditCardsProvider');
  }
  return context;
};

export const CreditCardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'creditCards'), (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        cardId: docSnap.id,
        ...docSnap.data()
      })) as CreditCard[];
      setCreditCards(data);
    });
    return unsubscribe;
  }, []);

  const adjustCreditCardBalance = async (cardId: string, newBalance: number, reason: string, relatedTransactionId?: string | null) => {
    if (!currentUser?.uid) return;
    const cardRef = doc(db, 'creditCards', cardId);

    const card = creditCards.find(c => c.cardId === cardId);
    if (!card) return;

    const previousBalance = card.currentBalance;
    const delta = newBalance - previousBalance;

    // Update the credit card
    await updateDoc(cardRef, {
      currentBalance: newBalance,
      availableBalance: card.limit - newBalance,
      lastUpdated: serverTimestamp()
    });

    // Log the audit entry
    await addDoc(collection(db, 'creditCardAuditLog'), {
      cardId,
      type: relatedTransactionId ? 'transaction' : 'manual-adjustment',
      relatedTransactionId: relatedTransactionId || null,
      previousBalance,
      newBalance,
      delta,
      updatedBy: currentUser.uid,
      reason: relatedTransactionId ? '' : reason,
      timestamp: serverTimestamp()
    });
  };

  const value = {
    creditCards,
    adjustCreditCardBalance
  };

  return (
    <CreditCardsContext.Provider value={value}>
      {children}
    </CreditCardsContext.Provider>
  );
};
