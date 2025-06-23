
import React from 'react'; 
import { useState, useEffect, ChangeEvent, useMemo }from 'react'; 
import { Transaction, TransactionType, Account, Category, Tag, CreditCard, MoneyBox, MoneyBoxRelatedTransactionData } from '../types'; // Added MoneyBox, MoneyBoxRelatedTransactionData
import { TRANSACTION_TYPE_OPTIONS } from '../constants';
import { getISODateString, formatCurrency } from '../utils/helpers';
import Input from './Input';
import Select from './Select';
import Button from './Button';

interface TransactionFormProps {
  onSubmit: (transaction: Transaction | Omit<Transaction, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | MoneyBoxRelatedTransactionData) => void;
  onCancel: () => void;
  accounts: Account[];
  creditCards: CreditCard[];
  moneyBoxes: MoneyBox[]; // Added moneyBoxes
  categories: Category[];
  tags: Tag[]; 
  initialTransaction?: Transaction | null; // Note: Editing MoneyBox-linked transactions via this form is simplified (won't adjust MoneyBoxTransaction)
  isPrivacyModeEnabled?: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSubmit, onCancel, accounts, creditCards, moneyBoxes, categories, tags, initialTransaction, isPrivacyModeEnabled 
}) => {
  const [type, setType] = useState<TransactionType>(initialTransaction?.type || TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>(initialTransaction?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState<string>(initialTransaction?.category_id || '');
  const [description, setDescription] = useState<string>(initialTransaction?.description || '');
  const [date, setDate] = useState<string>(initialTransaction?.date || getISODateString());
  const [sourceId, setSourceId] = useState<string>(initialTransaction?.account_id || ''); // Can be Account, CreditCard, or MoneyBox ID
  const [toAccountId, setToAccountId] = useState<string>(initialTransaction?.to_account_id || (accounts.length > 1 ? accounts[1].id : ''));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTransaction?.tag_ids || []);
  
  const [backingAccountId, setBackingAccountId] = useState<string>(accounts.length > 0 ? accounts[0].id : ''); // Real account for MoneyBox movement
  const [isMoneyBoxSource, setIsMoneyBoxSource] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sourceOptions = useMemo(() => {
    const accOpts = accounts.map(a => ({ value: a.id, label: `Conta: ${a.name}`, type: 'account' as const }));
    const cardOpts = creditCards.map(cc => ({ value: cc.id, label: `Cartão: ${cc.name}`, type: 'creditCard' as const }));
    const mbOpts = moneyBoxes.map(mb => ({ value: mb.id, label: `Caixinha: ${mb.name}`, type: 'moneyBox' as const }));
    const allOptions = [...accOpts, ...cardOpts, ...mbOpts];
    if (!initialTransaction && allOptions.length > 0 && !sourceId) {
      setSourceId(allOptions[0].value);
    }
    return allOptions;
  }, [accounts, creditCards, moneyBoxes, initialTransaction, sourceId]);

  useEffect(() => {
    const selectedSourceDetails = sourceOptions.find(s => s.value === sourceId);
    setIsMoneyBoxSource(selectedSourceDetails?.type === 'moneyBox');

    if (selectedSourceDetails?.type === 'moneyBox' && type === TransactionType.TRANSFER) {
        setType(TransactionType.EXPENSE); // Default to expense if transfer is selected with moneybox
        // Optionally add a toast notification here
    }
     // If type is INCOME or TRANSFER, and a credit card was selected, switch to first account.
    if (selectedSourceDetails?.type === 'creditCard' && (type === TransactionType.INCOME || type === TransactionType.TRANSFER)) {
        setSourceId(accounts[0]?.id || ''); 
    }
    // If backing account is not set and source is moneybox, set default
    if (selectedSourceDetails?.type === 'moneyBox' && !backingAccountId && accounts.length > 0) {
        setBackingAccountId(accounts[0].id);
    }


  }, [sourceId, sourceOptions, type, accounts, backingAccountId]);


  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setCategoryId(initialTransaction.category_id || '');
      setDescription(initialTransaction.description || '');
      setDate(initialTransaction.date);
      setSourceId(initialTransaction.account_id); 
      setToAccountId(initialTransaction.to_account_id || '');
      setSelectedTagIds(initialTransaction.tag_ids || []);
      // Note: Logic to pre-fill backingAccountId if initialTransaction was MoneyBox-linked is omitted for edit simplification.
    } else {
      // Reset to defaults for new transaction
      setType(TransactionType.EXPENSE);
      setAmount('');
      setCategoryId(categories.filter(c => c.type === TransactionType.EXPENSE)[0]?.id || '');
      setDescription('');
      setDate(getISODateString());
      setSourceId(sourceOptions[0]?.value || '');
      setToAccountId(accounts.length > 1 ? accounts[1].id : (accounts.length > 0 ? accounts[0].id : ''));
      setSelectedTagIds([]);
      setBackingAccountId(accounts.length > 0 ? accounts[0].id : '');
    }
  }, [initialTransaction, accounts, categories, sourceOptions]); // Rerun if sourceOptions changes (e.g. new moneybox added)
  
  useEffect(() => {
    if (type !== TransactionType.TRANSFER && !isMoneyBoxSource) { // Category only relevant if not transfer and not moneybox source (handled separately)
        const currentCategory = categories.find(c => c.id === categoryId);
        if (!currentCategory || currentCategory.type !== type) {
            const defaultCategoryForType = categories.find(c => c.type === type);
            setCategoryId(defaultCategoryForType?.id || '');
        }
    }
  }, [type, categoryId, categories, isMoneyBoxSource]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valor deve ser maior que zero.';
    
    const selectedSourceDetails = sourceOptions.find(s => s.value === sourceId);
    
    if (isMoneyBoxSource) {
        if (type === TransactionType.TRANSFER) newErrors.type = 'Transferências diretas de/para caixinhas não são permitidas aqui. Use a tela de Caixinhas.';
        if (!backingAccountId) newErrors.backingAccountId = 'Conta real para movimentação é obrigatória.';
        // Category can be optional for MoneyBox movements if desired, or handled by default.
    } else { // Not a MoneyBox source
        if (type !== TransactionType.TRANSFER && !categoryId && selectedSourceDetails?.type !== 'creditCard') {
            newErrors.categoryId = 'Categoria é obrigatória.';
        }
        if (!sourceId) newErrors.sourceId = 'Origem (Conta/Cartão) é obrigatória.';
        if (type === TransactionType.TRANSFER && !toAccountId) newErrors.toAccountId = 'Conta de destino é obrigatória.';
        if (type === TransactionType.TRANSFER && sourceId === toAccountId) newErrors.toAccountId = 'Conta de origem e destino não podem ser iguais.';
        if (type === TransactionType.TRANSFER && selectedSourceDetails?.type === 'creditCard') {
            newErrors.sourceId = 'Transferências não podem originar de um cartão de crédito.';
        }
    }
    if (!date) newErrors.date = 'Data é obrigatória.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isMoneyBoxSource) {
        const mbTransactionData: MoneyBoxRelatedTransactionData = {
            isMoneyBoxTransaction: true,
            moneyBoxId: sourceId,
            backingAccountId: backingAccountId,
            type: type as TransactionType.INCOME | TransactionType.EXPENSE, // type is already validated
            amount: parseFloat(amount),
            category_id: categoryId || undefined, // Category might be optional or set by default logic in App.tsx for MBT
            description: description || undefined,
            date,
            tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
            id: initialTransaction?.id, // Pass main transaction ID if editing
        };
        onSubmit(mbTransactionData);
    } else {
        const transactionData = {
            ...(initialTransaction ? { id: initialTransaction.id } : {}), 
            type,
            amount: parseFloat(amount),
            category_id: type === TransactionType.TRANSFER ? undefined : categoryId,
            description: description || undefined,
            date,
            account_id: sourceId,
            to_account_id: type === TransactionType.TRANSFER ? toAccountId : undefined,
            tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        };
        onSubmit(transactionData as any); 
    }
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
        options={isMoneyBoxSource ? TRANSACTION_TYPE_OPTIONS.filter(o => o.value !== TransactionType.TRANSFER) : TRANSACTION_TYPE_OPTIONS}
        value={type}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.target.value as TransactionType)}
        error={errors.type}
        disabled={isMoneyBoxSource && type === TransactionType.TRANSFER}
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
      {type !== TransactionType.TRANSFER && ( // Category field for non-transfer types
        <Select
          label={selectedSourceIsCard && type === TransactionType.EXPENSE ? "Categoria (Opcional para Débito Direto no Cartão)" : "Categoria"}
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
        label={type === TransactionType.TRANSFER ? "Debitar de (Conta)" : "Origem (Conta / Cartão / Caixinha)"}
        id="sourceId"
        options={type === TransactionType.TRANSFER ? sourceOptions.filter(so => so.type === 'account') : sourceOptions}
        value={sourceId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setSourceId(e.target.value)}
        error={errors.sourceId}
        placeholder="Selecione uma origem"
        disabled={sourceOptions.length === 0}
      />
      
      {isMoneyBoxSource && type !== TransactionType.TRANSFER && (
        <Select
          label={type === TransactionType.EXPENSE ? "Conta Real para Movimentação (Saída)" : "Conta Real de Recebimento"}
          id="backingAccountId"
          options={accounts.map(a => ({ value: a.id, label: a.name }))}
          value={backingAccountId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setBackingAccountId(e.target.value)}
          error={errors.backingAccountId}
          placeholder="Selecione a conta real"
          disabled={accounts.length === 0}
          required
        />
      )}

      {type === TransactionType.TRANSFER && !isMoneyBoxSource && (
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
