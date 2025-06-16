
import React from 'react'; 
import { useState, useMemo, useCallback, ChangeEvent }from 'react'; 
import { Transaction, Account, Category, TransactionType, Tag } from '../types'; // Added Tag
import { PERIOD_FILTER_OPTIONS, TRANSACTION_TYPE_OPTIONS } from '../constants';
import { getISODateString } from '../utils/helpers';
import TransactionItem from './TransactionItem';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import Select from './Select';
import Input from './Input';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  tags: Tag[]; // New: All available tags
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  categories,
  tags, // New
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]); // New: For filtering by tags
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const accountOptions = [{ value: 'all', label: 'Todas as Contas' }, ...accounts.map(a => ({ value: a.id, label: a.name }))];
  const categoryOptions = [{ value: 'all', label: 'Todas as Categorias' }, ...categories.map(c => ({ value: c.id, label: c.name }))];
  const typeOptions = [{ value: 'all', label: 'Todos os Tipos' }, ...TRANSACTION_TYPE_OPTIONS];
  const tagOptions = tags.map(t => ({ value: t.id, label: t.name })); // New: Options for tag filter

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
    if (filterAccount !== 'all') items = items.filter(t => t.accountId === filterAccount || t.toAccountId === filterAccount);
    if (filterCategory !== 'all') items = items.filter(t => t.categoryId === filterCategory);

    // New: Tag Filter (match if any selected tag is in transaction's tags)
    if (filterTags.length > 0) {
      items = items.filter(t => t.tagIds && t.tagIds.some(tagId => filterTags.includes(tagId)));
    }

    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      items = items.filter(t => 
        (t.description && t.description.toLowerCase().includes(lowerSearchTerm)) ||
        (t.categoryId && categories.find(c=>c.id === t.categoryId)?.name.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    items.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return items;
  }, [transactions, filterPeriod, filterType, filterAccount, filterCategory, filterTags, searchTerm, categories, sortOrder]);
  
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
        <Button onClick={onAddTransaction} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Transação
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-surface dark:bg-surfaceDark rounded-lg shadow dark:shadow-neutralDark/30">
        <Select label="Período" options={PERIOD_FILTER_OPTIONS} value={filterPeriod} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterPeriod(e.target.value)} />
        <Select label="Tipo" options={typeOptions} value={filterType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)} />
        <Select label="Conta" options={accountOptions} value={filterAccount} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterAccount(e.target.value)} />
        <Select label="Categoria" options={categoryOptions} value={filterCategory} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)} disabled={filterType === TransactionType.TRANSFER.toString()} />
        {/* New: Tag Filter Select */}
        {tags.length > 0 && (
            <Select 
                label="Tags" 
                options={tagOptions} 
                value={filterTags} 
                onChange={handleTagFilterChange} 
                multiple 
                className="h-24" // Adjust height for multi-select
                placeholder="Todas as Tags"
            />
        )}
        <Input label="Buscar Descrição" type="text" placeholder="Ex: Supermercado" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} containerClassName={tags.length === 0 ? 'lg:col-span-2' : ''} />
      </div>
      
      <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={toggleSortOrder}>
              Ordenar por Data: {sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigas'}
          </Button>
      </div>

      {filteredTransactions.length > 0 ? (
        <ul className="space-y-3">
          {filteredTransactions.map(transaction => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              accounts={accounts}
              categories={categories}
              tags={tags} // Pass tags to TransactionItem
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
            />
          ))}
        </ul>
      ) : (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma transação encontrada com os filtros aplicados.</p>
      )}
    </div>
  );
};

export default TransactionsView;