
import React from 'react'; 
import { useState, useEffect, ChangeEvent }from 'react'; 
import { Transaction, TransactionType, Account, Category, Tag } from '../types'; // Added Tag
import { TRANSACTION_TYPE_OPTIONS } from '../constants';
import { generateId, getISODateString, formatCurrency } from '../utils/helpers';
import Input from './Input';
import Select from './Select';
import Button from './Button';

interface TransactionFormProps {
  onSubmit: (transaction: Transaction | Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  accounts: Account[];
  categories: Category[];
  tags: Tag[]; 
  initialTransaction?: Transaction | null;
  isPrivacyModeEnabled?: boolean; // New prop
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSubmit, onCancel, accounts, categories, tags, initialTransaction, isPrivacyModeEnabled 
}) => {
  const [type, setType] = useState<TransactionType>(initialTransaction?.type || TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>(initialTransaction?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState<string>(initialTransaction?.category_id || '');
  const [description, setDescription] = useState<string>(initialTransaction?.description || '');
  const [date, setDate] = useState<string>(initialTransaction?.date || getISODateString());
  const [accountId, setAccountId] = useState<string>(initialTransaction?.account_id || (accounts.length > 0 ? accounts[0].id : ''));
  const [toAccountId, setToAccountId] = useState<string>(initialTransaction?.to_account_id || (accounts.length > 1 ? accounts[1].id : ''));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTransaction?.tag_ids || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setCategoryId(initialTransaction.category_id || '');
      setDescription(initialTransaction.description || '');
      setDate(initialTransaction.date);
      setAccountId(initialTransaction.account_id);
      setToAccountId(initialTransaction.to_account_id || '');
      setSelectedTagIds(initialTransaction.tag_ids || []);
    } else {
      setType(TransactionType.EXPENSE);
      setAmount('');
      setCategoryId(categories.filter(c => c.type === TransactionType.EXPENSE)[0]?.id || '');
      setDescription('');
      setDate(getISODateString());
      setAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
      setSelectedTagIds([]);
    }
  }, [initialTransaction, accounts, categories]);
  
  useEffect(() => {
    if (type !== TransactionType.TRANSFER) {
        const currentCategory = categories.find(c => c.id === categoryId);
        if (!currentCategory || currentCategory.type !== type) {
            const defaultCategoryForType = categories.find(c => c.type === type);
            setCategoryId(defaultCategoryForType?.id || '');
        }
    }
  }, [type, categoryId, categories]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valor deve ser maior que zero.';
    if (type !== TransactionType.TRANSFER && !categoryId) newErrors.categoryId = 'Categoria é obrigatória.';
    if (!accountId) newErrors.accountId = 'Conta é obrigatória.';
    if (type === TransactionType.TRANSFER && !toAccountId) newErrors.toAccountId = 'Conta de destino é obrigatória.';
    if (type === TransactionType.TRANSFER && accountId === toAccountId) newErrors.toAccountId = 'Conta de origem e destino não podem ser iguais.';
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
      account_id: accountId,
      to_account_id: type === TransactionType.TRANSFER ? toAccountId : undefined,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };
    // Casting to any to satisfy the complex conditional type for onSubmit
    // Supabase will handle user_id, created_at, updated_at
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
          label="Categoria"
          id="category"
          options={filteredCategories.map(c => ({ value: c.id, label: c.name }))}
          value={categoryId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value)}
          error={errors.categoryId}
          placeholder="Selecione uma categoria"
          disabled={filteredCategories.length === 0}
        />
      )}
      <Input
        label="Descrição (Opcional)"
        id="description"
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
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
        label={type === TransactionType.TRANSFER ? "Conta de Origem" : "Conta"}
        id="accountId"
        options={accounts.map(a => ({ value: a.id, label: a.name }))}
        value={accountId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setAccountId(e.target.value)}
        error={errors.accountId}
        placeholder="Selecione uma conta"
        disabled={accounts.length === 0}
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