

import React from 'react'; 
import { useState, useEffect, ChangeEvent, useMemo }from 'react'; 
import { Transaction, TransactionType, Account, Category, Tag, CreditCard } from '../types'; // Added CreditCard
import { TRANSACTION_TYPE_OPTIONS } from '../constants';
import { generateId, getISODateString, formatCurrency } from '../utils/helpers';
import Input from './Input';
import Select from './Select';
import Button from './Button';

interface TransactionFormProps {
  onSubmit: (transaction: Transaction | Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  accounts: Account[];
  creditCards: CreditCard[]; // Added creditCards
  categories: Category[];
  tags: Tag[]; 
  initialTransaction?: Transaction | null;
  isPrivacyModeEnabled?: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSubmit, onCancel, accounts, creditCards, categories, tags, initialTransaction, isPrivacyModeEnabled 
}) => {
  const [type, setType] = useState<TransactionType>(initialTransaction?.type || TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>(initialTransaction?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState<string>(initialTransaction?.category_id || '');
  const [description, setDescription] = useState<string>(initialTransaction?.description || '');
  const [date, setDate] = useState<string>(initialTransaction?.date || getISODateString());
  const [sourceId, setSourceId] = useState<string>(initialTransaction?.account_id || (accounts.length > 0 ? accounts[0].id : '')); // Renamed from accountId to sourceId
  const [toAccountId, setToAccountId] = useState<string>(initialTransaction?.to_account_id || (accounts.length > 1 ? accounts[1].id : ''));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTransaction?.tag_ids || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sourceOptions = useMemo(() => {
    const accOpts = accounts.map(a => ({ value: a.id, label: `Conta: ${a.name}`, type: 'account' }));
    const cardOpts = creditCards.map(cc => ({ value: cc.id, label: `Cartão: ${cc.name}`, type: 'creditCard' }));
    return [...accOpts, ...cardOpts];
  }, [accounts, creditCards]);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setCategoryId(initialTransaction.category_id || '');
      setDescription(initialTransaction.description || '');
      setDate(initialTransaction.date);
      setSourceId(initialTransaction.account_id); // account_id in Transaction can be an account or card ID
      setToAccountId(initialTransaction.to_account_id || '');
      setSelectedTagIds(initialTransaction.tag_ids || []);
    } else {
      setType(TransactionType.EXPENSE);
      setAmount('');
      setCategoryId(categories.filter(c => c.type === TransactionType.EXPENSE)[0]?.id || '');
      setDescription('');
      setDate(getISODateString());
      setSourceId(sourceOptions[0]?.value || '');
      setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
      setSelectedTagIds([]);
    }
  }, [initialTransaction, accounts, categories, sourceOptions]);
  
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
    // Expenses can be on credit cards.
    const selectedSource = sourceOptions.find(s => s.value === sourceId);
    if (selectedSource?.type === 'creditCard' && (type === TransactionType.INCOME || type === TransactionType.TRANSFER)) {
        setSourceId(accounts[0]?.id || ''); 
        // Add a toast notification here if desired.
    }

  }, [type, categoryId, categories, sourceId, accounts, sourceOptions]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valor deve ser maior que zero.';
    
    const selectedSource = sourceOptions.find(s => s.value === sourceId);
    if (type !== TransactionType.TRANSFER && !categoryId && selectedSource?.type !== 'creditCard') {
      // Category is optional if it's a direct debit on credit card, as the description will be primary.
      // However, for regular account expenses/income, it's still good practice.
      // For simplicity now, let's keep it required unless it's a transfer.
      // This can be refined later if direct card debits should also have optional categories.
       if (!categoryId) newErrors.categoryId = 'Categoria é obrigatória.';
    }


    if (!sourceId) newErrors.sourceId = 'Origem (Conta/Cartão) é obrigatória.';
    if (type === TransactionType.TRANSFER && !toAccountId) newErrors.toAccountId = 'Conta de destino é obrigatória.';
    if (type === TransactionType.TRANSFER && sourceId === toAccountId) newErrors.toAccountId = 'Conta de origem e destino não podem ser iguais.';
    if (type === TransactionType.TRANSFER && selectedSource?.type === 'creditCard') {
        newErrors.sourceId = 'Transferências não podem originar de um cartão de crédito.';
    }
    if (!date) newErrors.date = 'Data é obrigatória.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const transactionData = {
      ...(initialTransaction ? { id: initialTransaction.id } : {}), 
      type,
      amount: parseFloat(amount),
      category_id: type === TransactionType.TRANSFER ? undefined : categoryId,
      description,
      date,
      account_id: sourceId, // This now holds the ID of account OR credit card
      to_account_id: type === TransactionType.TRANSFER ? toAccountId : undefined,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };
    onSubmit(transactionData as any); 
  };

  const handleTagChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const value: string[] = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    setSelectedTagIds(value);
  };

  const filteredCategories = categories.filter(cat => cat.type === type);
  const tagOptions = tags.map(t => ({ value: t.id, label: t.name }));
  const selectedSourceIsCard = sourceOptions.find(s => s.value === sourceId)?.type === 'creditCard';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Tipo"
        id="type"
        options={TRANSACTION_TYPE_OPTIONS}
        value={type}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.target.value as TransactionType)}
      />
      <Input
        label="Valor"
        id="amount"
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
        placeholder={isPrivacyModeEnabled ? formatCurrency(0, 'BRL', 'pt-BR', true).replace('0,00', 'Ex: 123.45') : "Ex: 123.45"}
        required
      />
      {type !== TransactionType.TRANSFER && (
        <Select
          label={selectedSourceIsCard && type === TransactionType.EXPENSE ? "Categoria (Opcional para Débito Direto no Cartão)" : "Categoria"}
          id="category"
          options={filteredCategories.map(c => ({ value: c.id, label: c.name }))}
          value={categoryId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value)}
          error={errors.categoryId}
          placeholder="Selecione uma categoria"
          disabled={filteredCategories.length === 0}
          // Categoria pode ser opcional se for despesa no cartão, já que a descrição será usada.
          // required={!(selectedSourceIsCard && type === TransactionType.EXPENSE)} 
        />
      )}
      <Input
        label="Descrição (Opcional)"
        id="description"
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={selectedSourceIsCard && type === TransactionType.EXPENSE ? "Ex: Academia, Assinatura Spotify (será usado na fatura)" : "Ex: Compras no mercado"}
      />
      <Input
        label="Data"
        id="date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
        required
      />
      <Select
        label={type === TransactionType.TRANSFER ? "Debitar de (Conta)" : "Debitar de (Conta / Cartão)"}
        id="sourceId"
        options={type === TransactionType.TRANSFER ? sourceOptions.filter(so => so.type === 'account') : sourceOptions}
        value={sourceId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setSourceId(e.target.value)}
        error={errors.sourceId}
        placeholder="Selecione uma origem"
        disabled={sourceOptions.length === 0}
      />
      {type === TransactionType.TRANSFER && (
        <Select
          label="Conta de Destino"
          id="toAccountId"
          options={accounts.map(a => ({ value: a.id, label: a.name }))}
          value={toAccountId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setToAccountId(e.target.value)}
          error={errors.toAccountId}
          placeholder="Selecione uma conta de destino"
          disabled={accounts.length === 0}
        />
      )}
      {tags.length > 0 && (
        <Select
            label="Tags (Opcional, segure Ctrl/Cmd para selecionar várias)"
            id="tags"
            multiple 
            options={tagOptions}
            value={selectedTagIds}
            onChange={handleTagChange} 
            containerClassName="h-auto"
            className="h-24" 
        />
      )}

      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary">{initialTransaction ? 'Salvar Alterações' : 'Adicionar Transação'}</Button>
      </div>
    </form>
  );
};

export default TransactionForm;
