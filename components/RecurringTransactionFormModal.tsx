
import React from 'react';
import { useState, useEffect, ChangeEvent, useMemo } from 'react'; // Added useMemo
import { 
    RecurringTransaction, TransactionType, Account, Category, RecurringTransactionFrequency, CreditCard // Added CreditCard
} from '../types';
import { TRANSACTION_TYPE_OPTIONS } from '../constants';
import { getISODateString, formatDate } from '../utils/helpers';
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
        const lastPosted = new Date(lastPostedDateStr + 'T00:00:00'); 
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
    // Ensure new Date is created with local timezone interpretation from YYYY-MM-DD
    return getISODateString(new Date(startDateStr + 'T00:00:00')); 
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
  const [sourceId, setSourceId] = useState(''); // Renamed from accountId to sourceId
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
    const cardOpts = creditCards.map(cc => ({ value: cc.id, label: `Cartão: ${cc.name}`, type: 'creditCard' }));
    return [...accOpts, ...cardOpts];
  }, [accounts, creditCards]);

  useEffect(() => {
    if (isOpen) {
      if (existingRT) {
        setDescription(existingRT.description);
        setAmount(existingRT.amount.toString());
        setType(existingRT.type);
        setCategoryId(existingRT.category_id || '');
        setSourceId(existingRT.account_id); // account_id now holds sourceId
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
        setToAccountId(accounts.length > 1 ? accounts[1].id : (accounts.length > 0 ? accounts[0].id : ''));
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
  }, [existingRT, isOpen, accounts, categories, sourceOptions]);


  useEffect(() => {
    // If type changes, ensure category matches or reset
    if (type !== TransactionType.TRANSFER) {
        const currentCategory = categories.find(c => c.id === categoryId);
        if (!currentCategory || currentCategory.type !== type) {
            const defaultCategoryForType = categories.find(c => c.type === type);
            setCategoryId(defaultCategoryForType?.id || '');
        }
    }
    // If type is INCOME or TRANSFER, and a credit card was selected, switch to first account.
    const selectedSourceDetails = sourceOptions.find(s => s.value === sourceId);
    if (selectedSourceDetails?.type === 'creditCard' && (type === TransactionType.INCOME || type === TransactionType.TRANSFER)) {
        setSourceId(accounts[0]?.id || ''); 
    }
  }, [type, categoryId, categories, sourceId, accounts, sourceOptions]);


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'Descrição é obrigatória.';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valor deve ser positivo.';
    
    const selectedSourceDetails = sourceOptions.find(s => s.value === sourceId);
    if (type !== TransactionType.TRANSFER && !categoryId && selectedSourceDetails?.type !== 'creditCard') {
      newErrors.categoryId = 'Categoria é obrigatória.';
    }

    if (!sourceId) newErrors.sourceId = 'Origem (Conta/Cartão) é obrigatória.';
    if (type === TransactionType.TRANSFER && !toAccountId) newErrors.toAccountId = 'Conta de destino é obrigatória.';
    if (type === TransactionType.TRANSFER && sourceId === toAccountId) newErrors.toAccountId = 'Conta de origem e destino não podem ser iguais.';
    if (type === TransactionType.TRANSFER && selectedSourceDetails?.type === 'creditCard') {
        newErrors.sourceId = 'Transferências não podem originar de um cartão de crédito.';
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
      account_id: sourceId, // This now holds the ID of account OR credit card
      to_account_id: type === TransactionType.TRANSFER ? toAccountId : undefined,
      frequency,
      custom_interval_days: frequency === 'custom_days' ? parseInt(customIntervalDays) : undefined,
      start_date: startDate,
      end_date: endDate || undefined,
      occurrences: numOccurrences,
      remaining_occurrences: existingRT?.id ? existingRT.remaining_occurrences : numOccurrences,
      next_due_date: existingRT?.id && existingRT.next_due_date ? existingRT.next_due_date : calculateNextDueDateInternal(startDate, frequency, existingRT?.last_posted_date, frequency === 'custom_days' ? parseInt(customIntervalDays) : undefined),
      last_posted_date: existingRT?.last_posted_date,
      is_paused: isPaused || false,
      notes: notes.trim() || undefined,
    };
    const finalData = existingRT ? { ...rtData, id: existingRT.id } : rtData;
    onSave(finalData as any);
    onClose();
  };
  
  const filteredCategories = categories.filter(cat => cat.type === type);
  const currentSourceIsCard = sourceOptions.find(opt => opt.value === sourceId)?.type === 'creditCard';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingRT ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        <Input label="Descrição" id="rtDescription" value={description} onChange={e => setDescription(e.target.value)} error={errors.description} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Valor" id="rtAmount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} error={errors.amount} required />
            <Select label="Tipo" id="rtType" options={TRANSACTION_TYPE_OPTIONS} value={type} onChange={e => setType(e.target.value as TransactionType)} />
        </div>
        
        {type !== TransactionType.TRANSFER && (
            <Select 
                label={currentSourceIsCard && type === TransactionType.EXPENSE ? "Categoria (Opcional para Débito Direto no Cartão)" : "Categoria"}
                id="rtCategory" 
                options={filteredCategories.map(c => ({ value: c.id, label: c.name }))} 
                value={categoryId} onChange={e => setCategoryId(e.target.value)} 
                error={errors.categoryId} 
                placeholder="Selecione uma categoria" 
                disabled={filteredCategories.length === 0} 
            />
        )}
        
        <Select 
            label={type === TransactionType.TRANSFER ? "Origem (Conta)" : "Origem (Conta / Cartão)"} 
            id="rtSourceId" 
            options={type === TransactionType.TRANSFER ? sourceOptions.filter(so => so.type === 'account') : sourceOptions}
            value={sourceId} 
            onChange={e => setSourceId(e.target.value)} 
            error={errors.sourceId} 
            placeholder="Selecione uma origem" 
            disabled={sourceOptions.length === 0} 
        />
        
        {type === TransactionType.TRANSFER && (
            <Select 
                label="Conta de Destino" 
                id="rtToAccountId" 
                options={accounts.map(a => ({ value: a.id, label: a.name }))} 
                value={toAccountId} 
                onChange={e => setToAccountId(e.target.value)} 
                error={errors.toAccountId} 
                placeholder="Selecione conta de destino" 
                disabled={accounts.length === 0} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Frequência" id="rtFrequency" options={frequencyOptions} value={frequency} onChange={e => setFrequency(e.target.value as RecurringTransactionFrequency)} />
            {frequency === 'custom_days' && (
                <Input label="Intervalo (dias)" id="rtCustomInterval" type="number" min="1" value={customIntervalDays} onChange={e => setCustomIntervalDays(e.target.value)} error={errors.customIntervalDays} />
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Data de Início" id="rtStartDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} error={errors.startDate} required />
            <Input label="Data Final (Opcional)" id="rtEndDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} error={errors.endDate} min={startDate} />
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
