import React from 'react';
import { useState, useEffect, ChangeEvent } from 'react';
import { Debt, DebtType } from '../types';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { generateId } from '../utils/helpers';

const debtTypeOptions: { value: DebtType; label: string }[] = [
  { value: 'credit_card_balance', label: 'Saldo de Cartão de Crédito' },
  { value: 'personal_loan', label: 'Empréstimo Pessoal' },
  { value: 'student_loan', label: 'Empréstimo Estudantil' },
  { value: 'mortgage', label: 'Hipoteca / Financiamento Imob.' },
  { value: 'car_loan', label: 'Financiamento de Veículo' },
  { value: 'other', label: 'Outra Dívida' },
];

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'>) => void;
  existingDebt?: Debt | null;
}

const DebtFormModal: React.FC<DebtFormModalProps> = ({ isOpen, onClose, onSave, existingDebt }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('other');
  const [initialBalance, setInitialBalance] = useState('');
  const [interestRateAnnual, setInterestRateAnnual] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [dueDateDayOfMonth, setDueDateDayOfMonth] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (existingDebt) {
        setName(existingDebt.name);
        setType(existingDebt.type);
        setInitialBalance(existingDebt.initial_balance.toString());
        setInterestRateAnnual(existingDebt.interest_rate_annual.toString());
        setMinimumPayment(existingDebt.minimum_payment.toString());
        setDueDateDayOfMonth(existingDebt.due_date_day_of_month?.toString() || '');
      } else {
        setName('');
        setType('other');
        setInitialBalance('');
        setInterestRateAnnual('');
        setMinimumPayment('');
        setDueDateDayOfMonth('');
      }
      setErrors({});
    }
  }, [existingDebt, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome da dívida é obrigatório.';
    
    const numInitialBalance = parseFloat(initialBalance);
    if (isNaN(numInitialBalance) || numInitialBalance <= 0) newErrors.initialBalance = 'Saldo inicial deve ser positivo.';
    
    const numInterestRate = parseFloat(interestRateAnnual);
    if (isNaN(numInterestRate) || numInterestRate < 0) newErrors.interestRateAnnual = 'Taxa de juros deve ser um número não negativo.';
    
    const numMinimumPayment = parseFloat(minimumPayment);
    if (isNaN(numMinimumPayment) || numMinimumPayment <= 0) newErrors.minimumPayment = 'Pagamento mínimo deve ser positivo.';

    if (dueDateDayOfMonth) {
      const numDueDateDay = parseInt(dueDateDayOfMonth, 10);
      if (isNaN(numDueDateDay) || numDueDateDay < 1 || numDueDateDay > 31) {
        newErrors.dueDateDayOfMonth = 'Dia de vencimento deve ser entre 1 e 31.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const debtData: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'> = {
      name: name.trim(),
      type,
      initial_balance: parseFloat(initialBalance),
      interest_rate_annual: parseFloat(interestRateAnnual),
      minimum_payment: parseFloat(minimumPayment),
      due_date_day_of_month: dueDateDayOfMonth ? parseInt(dueDateDayOfMonth, 10) : undefined,
    };
    
    const dataToSave = existingDebt 
      ? { ...debtData, id: existingDebt.id } 
      : { ...debtData, id: generateId() }; // Supabase will generate ID on insert, this is for client-side consistency if needed

    onSave(dataToSave);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingDebt ? 'Editar Dívida' : 'Nova Dívida'} size="lg">
      <div className="space-y-4">
        <Input
          label="Nome da Dívida"
          id="debtName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Ex: Cartão XP Fatura, Financiamento Carro"
          required
        />
        <Select
          label="Tipo de Dívida"
          id="debtType"
          options={debtTypeOptions}
          value={type}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.target.value as DebtType)}
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
            label="Saldo Devedor Inicial (R$)"
            id="initialBalance"
            type="number"
            step="0.01"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            error={errors.initialBalance}
            required
            />
            <Input
            label="Taxa de Juros Anual (%)"
            id="interestRateAnnual"
            type="number"
            step="0.01"
            value={interestRateAnnual}
            onChange={(e) => setInterestRateAnnual(e.target.value)}
            error={errors.interestRateAnnual}
            placeholder="Ex: 19.9 para 19.9%"
            required
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
            label="Pagamento Mínimo Mensal (R$)"
            id="minimumPayment"
            type="number"
            step="0.01"
            value={minimumPayment}
            onChange={(e) => setMinimumPayment(e.target.value)}
            error={errors.minimumPayment}
            required
            />
            <Input
            label="Dia de Vencimento (Opcional)"
            id="dueDateDayOfMonth"
            type="number"
            min="1"
            max="31"
            value={dueDateDayOfMonth}
            onChange={(e) => setDueDateDayOfMonth(e.target.value)}
            error={errors.dueDateDayOfMonth}
            placeholder="Ex: 15"
            />
        </div>
        
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="primary" onClick={handleSubmit}>
            {existingDebt ? 'Salvar Alterações' : 'Adicionar Dívida'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DebtFormModal;
