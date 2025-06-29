
import React from 'react'; 
import { useState, useEffect, ChangeEvent, useMemo }from 'react'; 
import { Transaction, TransactionType, Account, Category, Tag, CreditCard, MoneyBox, MoneyBoxRelatedTransactionData, ToastType } from '../types'; // Added MoneyBox, MoneyBoxRelatedTransactionData
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
  moneyBoxes: MoneyBox[]; 
  categories: Category[];
  tags: Tag[]; 
  initialTransaction?: Transaction | null; 
  isPrivacyModeEnabled?: boolean;
  addToast: (message: string, type: ToastType, duration?: number) => void; // Added for feedback
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSubmit, onCancel, accounts, creditCards, moneyBoxes, categories, tags, initialTransaction, isPrivacyModeEnabled, addToast
}) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(getISODateString());
  const [sourceId, setSourceId] = useState<string>(''); // Can be Account, CreditCard, or MoneyBox ID
  
  // New state for enhanced transfers
  const [transferTargetType, setTransferTargetType] = useState<'account' | 'person'>('account');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  const [backingAccountId, setBackingAccountId] = useState<string>(''); // Real account for MoneyBox movement
  const [isMoneyBoxSource, setIsMoneyBoxSource] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sourceOptions = useMemo(() => {
    const accOpts = accounts.map(a => ({ value: a.id, label: `Conta: ${a.name}`, type: 'account' as const }));
    const cardOpts = creditCards.map(cc => ({ value: cc.id, label: `Cartão: ${cc.name}`, type: 'creditCard' as const }));
    const mbOpts = moneyBoxes.map(mb => ({ value: mb.id, label: `Caixinha: ${mb.name}`, type: 'moneyBox' as const }));
    return [...accOpts, ...cardOpts, ...mbOpts];
  }, [accounts, creditCards, moneyBoxes]);

  useEffect(() => {
    // This effect initializes or resets the form based on initialTransaction or changes to core data lists.
    const newSourceOpts = [ // Re-calculate here to avoid complex deps on sourceOptions memo itself
        ...accounts.map(a => ({ value: a.id, label: `Conta: ${a.name}`, type: 'account' as const })),
        ...creditCards.map(cc => ({ value: cc.id, label: `Cartão: ${cc.name}`, type: 'creditCard' as const })),
        ...moneyBoxes.map(mb => ({ value: mb.id, label: `Caixinha: ${mb.name}`, type: 'moneyBox' as const }))
    ];

    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmount(initialTransaction.amount.toString());
      setCategoryId(initialTransaction.category_id || '');
      setDescription(initialTransaction.description || '');
      setDate(initialTransaction.date);
      setSourceId(initialTransaction.account_id); 
      setSelectedTagIds(initialTransaction.tag_ids || []);
      
      // Handle transfer target
      if (initialTransaction.type === TransactionType.TRANSFER) {
        if (initialTransaction.to_account_id) {
          setTransferTargetType('account');
          setToAccountId(initialTransaction.to_account_id);
          setPayeeName('');
        } else if (initialTransaction.payee_name) {
          setTransferTargetType('person');
          setPayeeName(initialTransaction.payee_name);
          setToAccountId('');
        }
      } else {
         setToAccountId(accounts.length > 1 ? accounts[1].id : '');
      }

      setBackingAccountId(accounts.length > 0 ? accounts[0].id : ''); 
    } else {
      // Reset to defaults for new transaction
      setType(TransactionType.EXPENSE);
      setAmount('');
      setCategoryId(categories.filter(c => c.type === TransactionType.EXPENSE)[0]?.id || '');
      setDescription('');
      setDate(getISODateString());
      setPayeeName('');

      if (newSourceOpts.length > 0) {
         if (!sourceId || !newSourceOpts.some(opt => opt.value === sourceId)) {
            setSourceId(newSourceOpts[0].value);
        }
      } else {
          setSourceId('');
      }
      setToAccountId(accounts.length > 1 ? accounts[1].id : (accounts.length > 0 ? accounts[0].id : ''));
      setSelectedTagIds([]);
      setBackingAccountId(accounts.length > 0 ? accounts[0].id : '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTransaction, accounts, categories, creditCards, moneyBoxes]); // sourceId intentionally omitted to prevent reset loop


  useEffect(() => {
    const selectedSourceDetails = sourceOptions.find(s => s.value === sourceId);
    setIsMoneyBoxSource(selectedSourceDetails?.type === 'moneyBox');

    // Corrective logic for invalid combinations or setting defaults based on source type
    if (selectedSourceDetails?.type === 'moneyBox' && type === TransactionType.TRANSFER) {
        setType(TransactionType.EXPENSE); 
        addToast("Transferências de caixinhas são tratadas como Despesa. Tipo alterado.", "info");
    }
    
    if (selectedSourceDetails?.type === 'creditCard' && (type === TransactionType.INCOME || type === TransactionType.TRANSFER)) {
        if (accounts.length > 0) {
            setSourceId(accounts[0].id);
            const msg = type === TransactionType.INCOME 
                ? "Receitas não podem originar de cartões. Origem alterada para primeira conta."
                : "Transferências não podem originar de cartões. Origem alterada para primeira conta.";
            addToast(msg, "warning");
        } else {
           setSourceId(''); 
           addToast("Nenhuma conta disponível para esta operação com cartão.", "error");
        }
    }
    
    if (selectedSourceDetails?.type === 'moneyBox' && !backingAccountId && accounts.length > 0) {
        setBackingAccountId(accounts[0].id);
    }
  }, [sourceId, type, sourceOptions, accounts, backingAccountId, addToast]);


  useEffect(() => {
    if (type !== TransactionType.TRANSFER && !isMoneyBoxSource) { 
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
    } else { 
        if (type !== TransactionType.TRANSFER && !categoryId && selectedSourceDetails?.type !== 'creditCard') {
            newErrors.categoryId = 'Categoria é obrigatória.';
        }
        if (!sourceId) newErrors.sourceId = 'Origem (Conta/Cartão) é obrigatória.';
        
        if (type === TransactionType.TRANSFER) {
          if (transferTargetType === 'account' && !toAccountId) newErrors.toAccountId = 'Conta de destino é obrigatória.';
          if (transferTargetType === 'account' && sourceId === toAccountId) newErrors.toAccountId = 'Conta de origem e destino não podem ser iguais.';
          if (transferTargetType === 'person' && !payeeName.trim()) newErrors.payeeName = 'Nome do destinatário é obrigatório.';
          if (selectedSourceDetails?.type === 'creditCard') {
            newErrors.sourceId = 'Transferências não podem originar de um cartão de crédito.';
          }
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
            type: type as TransactionType.INCOME | TransactionType.EXPENSE, 
            amount: parseFloat(amount),
            category_id: categoryId || undefined, 
            description: description || undefined,
            date,
            tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
            id: initialTransaction?.id, 
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
            to_account_id: type === TransactionType.TRANSFER && transferTargetType === 'account' ? toAccountId : undefined,
            payee_name: type === TransactionType.TRANSFER && transferTargetType === 'person' ? payeeName.trim() : undefined,
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
        <div className="p-3 border border-borderBase dark:border-borderBaseDark rounded-md space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="transferTarget" value="person" checked={transferTargetType === 'person'} onChange={() => setTransferTargetType('person')} className="form-radio text-primary dark:text-primaryDark" />
                <span>Para outra pessoa/empresa</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="transferTarget" value="account" checked={transferTargetType === 'account'} onChange={() => setTransferTargetType('account')} className="form-radio text-primary dark:text-primaryDark" />
                <span>Entre minhas contas</span>
              </label>
            </div>
            {transferTargetType === 'person' ? (
                <Input
                    label="Nome do Destinatário"
                    id="payeeName"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    error={errors.payeeName}
                    placeholder="Ex: João Silva"
                />
            ) : (
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
        </div>
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
