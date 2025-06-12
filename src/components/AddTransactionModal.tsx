import React, { useState } from 'react';
import { useTransactions } from '../contexts/TransactionsContext';
import { useCreditCards } from '../contexts/CreditCardsContext';

interface AddTransactionModalProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ clientId, isOpen, onClose }) => {
  const { addTransaction } = useTransactions();
  const { creditCards } = useCreditCards();

  const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTransaction({
      clientId,
      type,
      amount,
      date,
      description,
      status: 'pending',
      paymentMethod: type === 'outgoing' ? paymentMethod : null,
      createdBy: '', // will be injected in context method
    });
    onClose();
    // Reset form
    setType('incoming');
    setAmount(0);
    setDate('');
    setDescription('');
    setPaymentMethod(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Transaction</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Type:
            <select value={type} onChange={(e) => setType(e.target.value as 'incoming' | 'outgoing')}>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          </label>
          <label>
            Amount:
            <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} required />
          </label>
          <label>
            Date:
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Description:
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>
          {type === 'outgoing' && (
            <label>
              Payment Method:
              <select value={paymentMethod || ''} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="">-- Select --</option>
                {creditCards.map((card) => (
                  <option key={card.cardId} value={card.cardId}>
                    {card.name} (Available: ${card.availableBalance})
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit">Add Transaction</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
