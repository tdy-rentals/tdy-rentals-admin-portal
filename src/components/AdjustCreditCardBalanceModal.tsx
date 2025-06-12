import React, { useState } from 'react';
import { useCreditCards } from '../contexts/CreditCardsContext';

interface AdjustCreditCardBalanceModalProps {
  cardId: string;
  isOpen: boolean;
  onClose: () => void;
}

const AdjustCreditCardBalanceModal: React.FC<AdjustCreditCardBalanceModalProps> = ({ cardId, isOpen, onClose }) => {
  const { creditCards, adjustCreditCardBalance } = useCreditCards();

  const card = creditCards.find(c => c.cardId === cardId);
  const [newBalance, setNewBalance] = useState<number>(card ? card.currentBalance : 0);
  const [reason, setReason] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await adjustCreditCardBalance(cardId, newBalance, reason);
    onClose();
    setReason('');
  };

  if (!isOpen || !card) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Adjust Balance: {card.name}</h2>
        <form onSubmit={handleSubmit}>
          <p>Current Balance: ${card.currentBalance}</p>
          <label>
            New Balance:
            <input
              type="number"
              value={newBalance}
              onChange={(e) => setNewBalance(parseFloat(e.target.value))}
              required
            />
          </label>
          <label>
            Reason for Adjustment:
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
          <button type="submit">Submit Adjustment</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

export default AdjustCreditCardBalanceModal;
