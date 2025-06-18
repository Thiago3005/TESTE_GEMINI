
import React from 'react';
import { useState, useEffect, ChangeEvent } from 'react';
import { 
    RecurringTransaction, TransactionType, Account, Category, RecurringTransactionFrequency 
} from '../types';
import { TRANSACTION_TYPE_OPTIONS } from '../constants';
import { getISODateString, formatDate } from '../utils/helpers'; // generateId removed
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import Textarea from './Textarea'; 

const frequencyOptions: { value: RecurringTransactionFrequency; label: string }[] = [
    { value: 'daily', label: 'Diariamente' },
    { value: 'weekly', label: 'Semanalmente' },
    { value: 'monthly', label: 'Mensalmente' },
    { value: 'yearly', label: 'Anualmente' },
    { value: 'custom_days', label: 'Dias Personalizados' },
];

const calculateNextDueDateInternal = (startDateStr: string, frequency: RecurringTransactionFrequency, lastPostedDateStr?: string, customInterval?: number): string => {
    if (lastPostedDateStr) {
        const lastPosted = new Date(lastPostedDateStr + 'T00:00:00'); // Ensure local date
        let nextDue = new Date(lastPosted);

        switch (frequency) {
            case 'daily':
                nextDue.setDate(lastPosted.getDate() + 1);
                break;
            case 'weekly':
                nextDue.setDate(lastPosted.getDate() + 7);
                break;
            case 'monthly':
                nextDue.setMonth(lastPosted.getMonth() + 1);
                break;
            case 'yearly':
                nextDue.setFullYear(lastPosted.getFullYear() + 1);
                break;
            case 'custom_days':
                 nextDue.setDate(lastPosted.getDate() + (customInterval || 1));
                 break;
            default:
                return getISODateString(new Date(startDateStr + 'T00:00:00'));
        }
        return getISODateString(nextDue);
    }
    return getISODateString(new Date(startDateStr + 'T00:00:00')); // Default to startDate if no lastPostedDate
};


interface RecurringTransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rt: Omit<RecurringTransaction, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => void;
  accounts: Account[];
  categories: Category[];
  existingRT?: RecurringTransaction | null;
}

const RecurringTransactionFormModal: React.FC<RecurringTransactionFormModalProps> = ({
  isOpen, onClose, onSave, accounts, categories, existingRT
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  
  const [frequency, setFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [customIntervalDays, setCustomIntervalDays] = useState<string>('30');
  const [startDate, setStartDate] = useState(getISODateString());
  const [endDate, setEndDate] = useState('');
  const [occurrences, setOccurrences] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (existingRT) {
        setDescription(existingRT.description);
        setAmount(existingRT.amount.toString());
        setType(existingRT.type);
        setCategoryId(existingRT.category_id || '');
        setAccountId(existingRT.account_id);
        setToAccountId(existingRT.to_account_id || '');
        setFrequency(existingRT.frequency);
        setCustomIntervalDays(existingRT.custom_interval_days?.toString() || '30');
        setStartDate(existingRT.start_date);
        setEndDate(existingRT.end_date || '');
        setOccurrences(existingRT.occurrences?.toString() || '');
        setIsPaused(existingRT.is_paused || false);
        setNotes(existingRT.notes || '');
      } else {
        setDescription('');
        setAmount('');
        setType(TransactionType.EXPENSE);
        setCategoryId(categories.filter(c => c.type === TransactionType.EXPENSE)[0]?.id || '');
        setAccountId(accounts[0]?.id || '');
        setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
        setFrequency('monthly');
        setCustomIntervalDays('30');
        setStartDate(getISODateString());
        setEndDate('');
        setOccurrences('');
        setIsPaused(false);
        setNotes('');
      }
      setErrors({});
    }
  }, [existingRT, isOpen, accounts, categories]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'Descrição é obrigatória.';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valor deve ser positivo.';
    if (type !== TransactionType.TRANSFER && !categoryId) newErrors.categoryId = 'Categoria é obrigatória.';
    if (!accountId) newErrors.accountId = 'Conta é obrigatória.';
    if (type === TransactionType.TRANSFER && !toAccountId) newErrors.toAccountId = 'Conta de destino é obrigatória.';
    if (type === TransactionType.TRANSFER && accountId === toAccountId) newErrors.toAccountId = 'Contas não podem ser iguais.';
    if (!startDate) newErrors.startDate = 'Data de início é obrigatória.';
    if (endDate && startDate > endDate) newErrors.endDate = 'Data final deve ser após data inicial.';
    if (occurrences && parseInt(occurrences) <=0) newErrors.occurrences = 'Ocorrências deve ser positivo.';
    if (frequency === 'custom_days' && (!customIntervalDays || parseInt(customIntervalDays) <= 0)) newErrors.customIntervalDays = "Intervalo de dias deve ser positivo.";


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const numOccurrences = occurrences ? parseInt(occurrences) : undefined;

    const rtData: Omit<RecurringTransaction, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> = {
      // id, user_id, profile_id, created_at, updated_at are handled by Supabase/App.tsx
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      category_id: type === TransactionType.TRANSFER ? undefined : categoryId,
      account_id: accountId,
      to_account_id: type === TransactionType.TRANSFER ? toAccountId : undefined,
      frequency,
      custom_interval_days: frequency === 'custom_days' ? parseInt(customIntervalDays) : undefined,
      start_date: startDate,
      end_date: endDate || undefined,
      occurrences: numOccurrences,
      remaining_occurrences: existingRT?.id ? existingRT.remaining_occurrences : numOccurrences,
      next_due_date: existingRT?.id ? existingRT.next_due_date : calculateNextDueDateInternal(startDate, frequency, undefined, frequency === 'custom_days' ? parseInt(customIntervalDays) : undefined),
      last_posted_date: existingRT?.last_posted_date,
      is_paused: isPaused || false,
      notes: notes.trim() || undefined,
    };
    const finalData = existingRT ? { ...rtData, id: existingRT.id } : rtData;
    onSave(finalData as any);
    onClose();
  };
  
  const filteredCategories = categories.filter(cat => cat.type === type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingRT ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        <Input label="Descrição" id="rtDescription" value={description} onChange={e => setDescription(e.target.value)} error={errors.description} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Valor" id="rtAmount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} error={errors.amount} required />
            <Select label="Tipo" id="rtType" options={TRANSACTION_TYPE_OPTIONS} value={type} onChange={e => setType(e.target.value as TransactionType)} />
        </div>
        
        {type !== TransactionType.TRANSFER && (
            <Select label="Categoria" id="rtCategory" options={filteredCategories.map(c => ({ value: c.id, label: c.name }))} value={categoryId} onChange={e => setCategoryId(e.target.value)} error={errors.categoryId} placeholder="Selecione uma categoria" disabled={filteredCategories.length === 0} />
        )}
        
        <Select label={type === TransactionType.TRANSFER ? "Conta de Origem" : "Conta"} id="rtAccountId" options={accounts.map(a => ({ value: a.id, label: a.name }))} value={accountId} onChange={e => setAccountId(e.target.value)} error={errors.accountId} placeholder="Selecione uma conta" disabled={accounts.length === 0} />
        
        {type === TransactionType.TRANSFER && (
            <Select label="Conta de Destino" id="rtToAccountId" options={accounts.map(a => ({ value: a.id, label: a.name }))} value={toAccountId} onChange={e => setToAccountId(e.target.value)} error={errors.toAccountId} placeholder="Selecione conta de destino" disabled={accounts.length === 0} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Frequência" id="rtFrequency" options={frequencyOptions} value={frequency} onChange={e => setFrequency(e.target.value as RecurringTransactionFrequency)} />
            {frequency === 'custom_days' && (
                <Input label="Intervalo (dias)" id="rtCustomInterval" type="number" min="1" value={customIntervalDays} onChange={e => setCustomIntervalDays(e.target.value)} error={errors.customIntervalDays} />
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Data de Início" id="rtStartDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} error={errors.startDate} required />
            <Input label="Data Final (Opcional)" id="rtEndDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} error={errors.endDate} />
        </div>
        
        <Input label="Número de Ocorrências (Opcional)" id="rtOccurrences" type="number" min="1" value={occurrences} onChange={e => setOccurrences(e.target.value)} error={errors.occurrences} placeholder="Deixe em branco para indefinido (use Data Final)" />

        <Textarea label="Notas (Opcional)" id="rtNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        
        <div className="flex items-center">
          <input type="checkbox" id="rtIsPaused" checked={isPaused} onChange={e => setIsPaused(e.target.checked)} className="h-4 w-4 text-primary rounded border-neutral/50 focus:ring-primary dark:text-primaryDark dark:border-neutralDark/50 dark:focus:ring-primaryDark" />
          <label htmlFor="rtIsPaused" className="ml-2 block text-sm text-textMuted dark:text-textMutedDark">Pausar esta recorrência</label>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">{existingRT ? 'Salvar Alterações' : 'Criar Recorrência'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default RecurringTransactionFormModal;
