

import React from 'react'; 
import { useState, useMemo, useCallback, ChangeEvent, useRef }from 'react'; 
import { Transaction, Account, Category, TransactionType, Tag, InstallmentPurchase } from '../types';
import { PERIOD_FILTER_OPTIONS, TRANSACTION_TYPE_OPTIONS } from '../constants';
import { getISODateString, formatCurrency } from '../utils/helpers';
import TransactionItem from './TransactionItem';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import Select from './Select';
import Input from './Input';
import DocumentArrowUpIcon from './icons/DocumentArrowUpIcon';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  tags: Tag[]; 
  installmentPurchases: InstallmentPurchase[]; // Added for traceability
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onImportStatement: (file: File) => void;
  isLoading?: boolean; // New prop for loading state
  isPrivacyModeEnabled?: boolean; // New prop
}

const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  categories,
  tags, 
  installmentPurchases,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onImportStatement,
  isLoading,
  isPrivacyModeEnabled,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]); 
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accountOptions = [{ value: 'all', label: 'Todas as Contas' }, ...accounts.map(a => ({ value: a.id, label: a.name }))];
  const categoryOptions = [{ value: 'all', label: 'Todas as Categorias' }, ...categories.map(c => ({ value: c.id, label: c.name }))];
  const typeOptions = [{ value: 'all', label: 'Todos os Tipos' }, ...TRANSACTION_TYPE_OPTIONS];
  const tagOptions = tags.map(t => ({ value: t.id, label: t.name })); 

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportStatement(file);
      // Reset file input value to allow re-uploading the same file
      event.target.value = '';
    }
  };


  const filteredTransactions = useMemo(() => {
    let items = [...transactions];

    if (filterPeriod !== 'all') {
      const today = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      if (filterPeriod === 'today') {
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      } else if (filterPeriod === 'current_month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (filterPeriod === 'last_7_days') {
        startDate = new Date(today); startDate.setDate(today.getDate() - 6); startDate.setHours(0,0,0,0);
      } else if (filterPeriod === 'last_30_days') {
        startDate = new Date(today); startDate.setDate(today.getDate() - 29); startDate.setHours(0,0,0,0);
      }
      if (startDate) {
        const startDateStr = getISODateString(startDate);
        const endDateStr = getISODateString(endDate);
        items = items.filter(t => t.date >= startDateStr && t.date <= endDateStr);
      }
    }

    if (filterType !== 'all') items = items.filter(t => t.type === filterType);
    if (filterAccount !== 'all') items = items.filter(t => t.account_id === filterAccount || t.to_account_id === filterAccount);
    if (filterCategory !== 'all') items = items.filter(t => t.category_id === filterCategory);

    if (filterTags.length > 0) {
      items = items.filter(t => t.tag_ids && t.tag_ids.some(tagId => filterTags.includes(tagId)));
    }

    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      items = items.filter(t => 
        (t.description && t.description.toLowerCase().includes(lowerSearchTerm)) ||
        (t.category_id && categories.find(c=>c.id === t.category_id)?.name.toLowerCase().includes(lowerSearchTerm)) ||
        (t.payee_name && t.payee_name.toLowerCase().includes(lowerSearchTerm)) ||
        (t.date.includes(lowerSearchTerm)) // Search by date
      );
    }
    
    items.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return items;
  }, [transactions, filterPeriod, filterType, filterAccount, filterCategory, filterTags, searchTerm, categories, sortOrder]);
  
  const summary = useMemo(() => {
    return filteredTransactions.reduce(
        (acc, transaction) => {
            if (transaction.type === TransactionType.INCOME) {
                acc.income += transaction.amount;
            } else if (transaction.type === TransactionType.EXPENSE) {
                acc.expense += transaction.amount;
            }
            return acc;
        },
        { income: 0, expense: 0 }
    );
  }, [filteredTransactions]);

  const balance = summary.income - summary.expense;

  const toggleSortOrder = useCallback(() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'), []);

  const handleTagFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const value: string[] = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    setFilterTags(value);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Transações</h1>
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            />
            <Button onClick={handleImportClick} variant="secondary">
                <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                Importar Extrato
            </Button>
            <Button onClick={onAddTransaction} variant="primary">
                <PlusIcon className="w-5 h-5 mr-2" />
                Nova Transação
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-surface dark:bg-surfaceDark rounded-lg shadow dark:shadow-neutralDark/30">
        <Select label="Período" options={PERIOD_FILTER_OPTIONS} value={filterPeriod} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterPeriod(e.target.value)} />
        <Select label="Tipo" options={typeOptions} value={filterType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)} />
        <Select label="Conta" options={accountOptions} value={filterAccount} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterAccount(e.target.value)} />
        <Select label="Categoria" options={categoryOptions} value={filterCategory} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)} disabled={filterType === TransactionType.TRANSFER.toString()} />
        {tags.length > 0 && (
            <Select 
                label="Tags" 
                options={tagOptions} 
                value={filterTags} 
                onChange={handleTagFilterChange} 
                multiple 
                className="h-24"
                placeholder="Todas as Tags"
            />
        )}
        <Input label="Buscar (Descrição, Dest., Data...)" type="text" placeholder="Ex: Mercado, 2024-07-15" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} containerClassName={tags.length === 0 ? 'lg:col-span-2' : ''} />
      </div>
      
      {filteredTransactions.length > 0 && (
        <div className="p-4 bg-surface dark:bg-surfaceDark rounded-lg shadow-sm flex flex-col sm:flex-row sm:justify-around items-center gap-4">
            <div className="text-center">
                <p className="text-sm font-medium text-textMuted dark:text-textMutedDark">Total Receitas</p>
                <p className="text-xl font-bold text-secondary dark:text-secondaryDark">{formatCurrency(summary.income, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-textMuted dark:text-textMutedDark">Total Despesas</p>
                <p className="text-xl font-bold text-destructive dark:text-destructiveDark">{formatCurrency(summary.expense, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-textMuted dark:text-textMutedDark">Saldo do Período</p>
                <p className={`text-xl font-bold ${balance >= 0 ? 'text-textBase dark:text-textBaseDark' : 'text-destructive dark:text-destructiveDark'}`}>{formatCurrency(balance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
            </div>
        </div>
      )}

      <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={toggleSortOrder}>
              Ordenar por Data: {sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigas'}
          </Button>
      </div>
      
      {isLoading && (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">Carregando transações...</p>
      )}

      {!isLoading && filteredTransactions.length > 0 ? (
        <ul className="space-y-3">
          {filteredTransactions.map(transaction => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              accounts={accounts}
              categories={categories}
              tags={tags} 
              installmentPurchases={installmentPurchases} // Pass for traceability
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
              isPrivacyModeEnabled={isPrivacyModeEnabled}
            />
          ))}
        </ul>
      ) : (
        !isLoading && <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma transação encontrada com os filtros aplicados.</p>
      )}
    </div>
  );
};

export default TransactionsView;