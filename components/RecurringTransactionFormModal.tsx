
import React from 'react';
import { useState, useEffect, ChangeEvent, useMemo } from 'react';
import { 
    RecurringTransaction, TransactionType, Account, Category, RecurringTransactionFrequency, CreditCard
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
  creditCards: CreditCard[]; // Added creditCards
  categories: Category[];
  existingRT?: RecurringTransaction | null;
}

const RecurringTransactionFormModal: React.FC<RecurringTransactionFormModalProps> = ({
  isOpen, onClose, onSave, accounts, creditCards, categories, existingRT
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [categoryId, setCategoryId] = useState('');
  const [sourceId, setSourceId] = useState(''); // Renamed from accountId
  const [toAccountId, setToAccountId] = useState('');
  
  const [frequency, setFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [customIntervalDays, setCustomIntervalDays] = useState<string>('30');
  const [startDate, setStartDate] = useState(getISODateString());
  const [endDate, setEndDate] = useState('');
  const [occurrences, setOccurrences] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const sourceOptions = useMemo(() => {
    const accOpts = accounts.map(a => ({ value: a.id, label: `Conta: ${a.name}`, type: 'account' }));
    if (type === TransactionType.EXPENSE) {
        const cardOpts = creditCards.map(cc => ({ value: cc.id, label: `Cartão: ${cc.name}`, type: 'creditCard' }));
        return [...accOpts, ...cardOpts];
    }
    return accOpts; // For INCOME and TRANSFER, only accounts are valid sources/destinations
  }, [accounts, creditCards, type]);


  useEffect(() => {
    if (isOpen) {
      if (existingRT) {
        setDescription(existingRT.description);
        setAmount(existingRT.amount.toString());
        setType(existingRT.type);
        setCategoryId(existingRT.category_id || '');
        setSourceId(existingRT.account_id);
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
        setSourceId(sourceOptions.length > 0 ? sourceOptions[0].value : '');
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
  }, [existingRT, isOpen, accounts, categories, sourceOptions]); // Added sourceOptions

  useEffect(() => {
    // Reset sourceId if type changes and current sourceId is not valid for new type
    const selectedSourceOpt = sourceOptions.find(s => s.value === sourceId);
    if (type === TransactionType.INCOME || type === TransactionType.TRANSFER) {
      if (selectedSourceOpt?.type === 'creditCard') {
        setSourceId(accounts[0]?.id || ''); // Default to first account if card was selected
      }
    }
    // If type changes to EXPENSE, and sourceId was an account, it's still valid.
    // If sourceId is empty or not in new sourceOptions, reset to first available.
    if (!selectedSourceOpt && sourceOptions.length > 0) {
        setSourceId(sourceOptions[0].value);
    }

  }, [type, sourceId, sourceOptions, accounts]);


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'Descrição é obrigatória.';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valor deve ser positivo.';
    
    const selectedSourceOpt = sourceOptions.find(s => s.value === sourceId);

    if (type !== TransactionType.TRANSFER && !categoryId && selectedSourceOpt?.type !== 'creditCard') {
        newErrors.categoryId = 'Categoria é obrigatória.';
    } else if (type !== TransactionType.TRANSFER && selectedSourceOpt?.type === 'creditCard' && !categoryId) {
        // Category can be optional for recurring card expenses if description is very clear,
        // but for consistency, let's still prompt for it, perhaps with a softer requirement.
        // For now, keep it "required" for simplicity in the error message.
        // newErrors.categoryId = 'Categoria é recomendada para despesas no cartão.';
    }

    if (!sourceId) newErrors.sourceId = 'Fonte (Conta/Cartão) é obrigatória.';
    if (type === TransactionType.TRANSFER && !toAccountId) newErrors.toAccountId = 'Conta de destino é obrigatória.';
    if (type === TransactionType.TRANSFER && sourceId === toAccountId) newErrors.toAccountId = 'Contas não podem ser iguais.';
    
    if (selectedSourceOpt?.type === 'creditCard' && type !== TransactionType.EXPENSE) {
        newErrors.sourceId = 'Cartões de crédito só podem ser usados para Despesas recorrentes.';
    }


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
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      category_id: type === TransactionType.TRANSFER ? undefined : categoryId,
      account_id: sourceId, // This now holds account OR credit card ID
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
  const selectedSourceIsCard = sourceOptions.find(s => s.value === sourceId)?.type === 'creditCard';

  let sourceLabel = "Conta";
  if (type === TransactionType.EXPENSE) sourceLabel = "Debitar de (Conta / Cartão)";
  else if (type === TransactionType.INCOME) sourceLabel = "Creditar em (Conta)";
  else if (type === TransactionType.TRANSFER) sourceLabel = "Conta de Origem";


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingRT ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        <Input label="Descrição" id="rtDescription" value={description} onChange={e => setDescription(e.target.value)} error={errors.description} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Valor" id="rtAmount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} error={errors.amount} required />
            <Select label="Tipo" id="rtType" options={TRANSACTION_TYPE_OPTIONS} value={type} 
              onChange={e => {
                const newType = e.target.value as TransactionType;
                setType(newType);
                // Reset category if it's not compatible with the new type
                const currentCategory = categories.find(c => c.id === categoryId);
                if (!currentCategory || currentCategory.type !== newType) {
                    setCategoryId(categories.find(c => c.type === newType)?.id || '');
                }
              }} 
            />
        </div>
        
        {type !== TransactionType.TRANSFER && (
            <Select 
              label={selectedSourceIsCard ? "Categoria (Referência para fatura)" : "Categoria"} 
              id="rtCategory" 
              options={filteredCategories.map(c => ({ value: c.id, label: c.name }))} 
              value={categoryId} 
              onChange={e => setCategoryId(e.target.value)} 
              error={errors.categoryId} 
              placeholder="Selecione uma categoria" 
              disabled={filteredCategories.length === 0} 
              // required={!selectedSourceIsCard} // Category is less critical if it's a direct card charge
            />
        )}
        
        <Select 
            label={sourceLabel}
            id="rtSourceId" 
            options={sourceOptions} 
            value={sourceId} 
            onChange={e => setSourceId(e.target.value)} 
            error={errors.sourceId} 
            placeholder="Selecione uma origem" 
            disabled={sourceOptions.length === 0} 
        />
        
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
