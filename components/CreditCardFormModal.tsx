
import React from 'react';
import { useState, useEffect } from 'react';
import { CreditCard } from '../types';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
// generateId removed as Supabase handles ID generation

interface CreditCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Omit<CreditCard, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => void;
  existingCard?: CreditCard | null;
}

const CreditCardFormModal: React.FC<CreditCardFormModalProps> = ({ isOpen, onClose, onSave, existingCard }) => {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingCard) {
      setName(existingCard.name);
      setLimit(existingCard.card_limit.toString());
      setClosingDay(existingCard.closing_day.toString());
      setDueDay(existingCard.due_day.toString());
    } else {
      setName('');
      setLimit('');
      setClosingDay('');
      setDueDay('');
    }
    setErrors({});
  }, [existingCard, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome do cartão é obrigatório.';
    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit <= 0) newErrors.limit = 'Limite deve ser um número positivo.';
    const numClosingDay = parseInt(closingDay, 10);
    if (isNaN(numClosingDay) || numClosingDay < 1 || numClosingDay > 31) newErrors.closingDay = 'Dia de fechamento deve ser entre 1 e 31.';
    const numDueDay = parseInt(dueDay, 10);
    if (isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) newErrors.dueDay = 'Dia de vencimento deve ser entre 1 e 31.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const cardData: Omit<CreditCard, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> = {
      // id, user_id, profile_id, created_at, updated_at are handled by Supabase/App.tsx
      name: name.trim(),
      card_limit: parseFloat(limit),
      closing_day: parseInt(closingDay, 10),
      due_day: parseInt(dueDay, 10),
    };
    // If existingCard is present, its id will be part of it and passed to onUpdateCreditCard in App.tsx
    const finalData = existingCard ? { ...cardData, id: existingCard.id } : cardData;
    onSave(finalData as any); // Cast as any because 'id' is conditionally present
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingCard ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}>
      <div className="space-y-4">
        <Input
          label="Nome do Cartão"
          id="cardName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Ex: Cartão Principal, Cartão Viagem"
        />
        <Input
          label="Limite do Cartão (R$)"
          id="cardLimit"
          type="number"
          step="0.01"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          error={errors.limit}
          placeholder="Ex: 5000.00"
        />
        <Input
          label="Dia de Fechamento da Fatura"
          id="cardClosingDay"
          type="number"
          min="1"
          max="31"
          value={closingDay}
          onChange={(e) => setClosingDay(e.target.value)}
          error={errors.closingDay}
          placeholder="Ex: 25"
        />
        <Input
          label="Dia de Vencimento da Fatura"
          id="cardDueDay"
          type="number"
          min="1"
          max="31"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          error={errors.dueDay}
          placeholder="Ex: 10"
        />
        {errors.form && <p className="text-sm text-destructive dark:text-destructiveDark/90">{errors.form}</p>}
        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>Salvar Cartão</Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreditCardFormModal;