import React from 'react'; 
import { useState, useEffect, ChangeEvent }from 'react'; 
import { Transaction, TransactionType, Account, Category, Tag } from '../types'; // Added Tag
import { TRANSACTION_TYPE_OPTIONS } from '../constants';
import { generateId, getISODateString } from '../utils/helpers';
import Input from './Input';
import Select from './Select';
import Button from './Button';

interface TransactionFormProps {
  onSubmit: (transaction: Transaction) => void;
  onCancel: () => void;
  accounts: Account[];
  categories: Category[];
  tags: Tag[]; // New: All available tags
  initialTransaction?: Transaction | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSubmit, onCancel, accounts, categories, tags, initialTransaction 
}) => {
  const [type, setType] = useState<TransactionType>(initialTransaction?.type || TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>(initialTransaction?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState<string>(initialTransaction?.categoryId || '');
  const [description, setDescription] = useState<string>(initialTransaction?.description || '');
  const [date, setDate] = useState<string>(initialTransaction?.date || getISODateString());
  const [accountId, setAccountId] = useState<string>(initialTransaction?.accountId || (accounts.length > 0 ? accounts[0].id : ''));
  const [toAccountId, setToAccountId] = useState<string>(initialTransaction?.toAccountId || (accounts.length > 1 ? accounts[1].id : ''));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTransaction?.tagIds || []); // New: State for selected tags
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setCategoryId(initialTransaction.categoryId || '');
      setDescription(initialTransaction.description || '');
      setDate(initialTransaction.date);
      setAccountId(initialTransaction.accountId);
      setToAccountId(initialTransaction.toAccountId || '');
      setSelectedTagIds(initialTransaction.tagIds || []); // New
    } else {
      // Reset form for new transaction
      setType(TransactionType.EXPENSE);
      setAmount('');
      setCategoryId(categories.filter(c => c.type === TransactionType.EXPENSE)[0]?.id || '');
      setDescription('');
      setDate(getISODateString());
      setAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
      setSelectedTagIds([]); // New
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

    const transactionData: Transaction = {
      id: initialTransaction?.id || generateId(),
      type,
      amount: parseFloat(amount),
      categoryId: type === TransactionType.TRANSFER ? undefined : categoryId,
      description,
      date,
      accountId,
      toAccountId: type === TransactionType.TRANSFER ? toAccountId : undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined, // New
    };
    onSubmit(transactionData);
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
      {/* New: Tag Selection */}
      {tags.length > 0 && (
        <Select
            label="Tags (Opcional, segure Ctrl/Cmd para selecionar várias)"
            id="tags"
            multiple // Allows multiple selections
            options={tagOptions}
            value={selectedTagIds} // Bind to state
            onChange={handleTagChange} // Custom handler for multi-select
            containerClassName="h-auto" // Adjust height if needed for multi-select
            className="h-24" // Example height for multi-select, adjust as needed
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