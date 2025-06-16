import React from 'react';
import { RecurringTransaction, TransactionType, Account, Category } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import ArrowPathIcon from './icons/ArrowPathIcon'; // Represents recurrence

interface RecurringTransactionItemProps {
  transaction: RecurringTransaction;
  accounts: Account[];
  categories: Category[];
  onEdit: (transaction: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onTogglePause?: (rtId: string) => void; // Optional for future use
}

const RecurringTransactionItem: React.FC<RecurringTransactionItemProps> = ({ 
    transaction, accounts, categories, onEdit, onDelete 
}) => {
  const account = accounts.find(a => a.id === transaction.accountId);
  const category = transaction.categoryId ? categories.find(c => c.id === transaction.categoryId) : null;

  let amountColor = 'text-textBase dark:text-textBaseDark';
  let sign = '';
  if (transaction.type === TransactionType.INCOME) {
    amountColor = 'text-secondary dark:text-secondaryDark';
    sign = '+';
  } else if (transaction.type === TransactionType.EXPENSE) {
    amountColor = 'text-destructive dark:text-destructiveDark';
    sign = '-';
  }

  const frequencyLabels: Record<string, string> = {
    daily: 'Diariamente',
    weekly: 'Semanalmente',
    monthly: 'Mensalmente',
    yearly: 'Anualmente',
    custom_days: `A cada ${transaction.customIntervalDays} dias`
  };

  return (
    <li className={`bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 ${transaction.isPaused ? 'opacity-60' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex-grow">
          <div className="flex items-center space-x-3 mb-1">
            <ArrowPathIcon className={`w-5 h-5 ${transaction.isPaused ? 'text-textMuted dark:text-textMutedDark' : 'text-primary dark:text-primaryDark'}`} />
            <span className={`font-semibold text-lg ${amountColor}`}>{sign}{formatCurrency(transaction.amount)}</span>
            <h3 className="text-md font-medium text-textBase dark:text-textBaseDark">{transaction.description}</h3>
          </div>
          <p className="text-sm text-textMuted dark:text-textMutedDark ml-8">
            {frequencyLabels[transaction.frequency]} &bull; Próximo: {formatDate(transaction.nextDueDate)}
            {transaction.endDate && ` &bull; Termina em: ${formatDate(transaction.endDate)}`}
            {transaction.remainingOccurrences !== undefined && transaction.occurrences && ` &bull; (${transaction.remainingOccurrences}/${transaction.occurrences} restantes)`}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark ml-8">
            Conta: {account?.name || 'N/A'}
            {category && ` &bull; Categoria: ${category.name}`}
            {transaction.isPaused && <span className="font-semibold text-amber-600 dark:text-amber-500"> (Pausado)</span>}
          </p>
          {transaction.notes && <p className="text-xs italic text-neutral dark:text-neutralDark ml-8 mt-1">Nota: {transaction.notes}</p>}
        </div>
        <div className="flex space-x-2 self-end sm:self-center">
          {/* onTogglePause button can be added here if needed */}
          <Button variant="ghost" size="sm" onClick={() => onEdit(transaction)} aria-label="Editar Recorrência">
            <EditIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(transaction.id)} aria-label="Excluir Recorrência">
            <TrashIcon className="w-4 h-4 text-destructive dark:text-destructiveDark" />
          </Button>
        </div>
      </div>
    </li>
  );
};

export default RecurringTransactionItem;