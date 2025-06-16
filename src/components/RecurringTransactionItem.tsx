import React from 'react';
import { RecurringTransaction, TransactionType, Account, Category } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import ArrowPathIcon from './icons/ArrowPathIcon'; // Represents recurrence

interface RecurringTransactionItemProps {
  rt: RecurringTransaction;
  accounts: Account[];
  categories: Category[];
  onEdit: (rt: RecurringTransaction) => void;
  onDelete: (rtId: string) => void;
  // onTogglePause?: (rtId: string) => void; // Removed
}

const RecurringTransactionItem: React.FC<RecurringTransactionItemProps> = ({ 
    rt, accounts, categories, onEdit, onDelete, /*onTogglePause*/ 
}) => {
  const account = accounts.find(a => a.id === rt.accountId);
  const category = rt.categoryId ? categories.find(c => c.id === rt.categoryId) : null;

  let amountColor = 'text-textBase dark:text-textBaseDark';
  let sign = '';
  if (rt.type === TransactionType.INCOME) {
    amountColor = 'text-secondary dark:text-secondaryDark';
    sign = '+';
  } else if (rt.type === TransactionType.EXPENSE) {
    amountColor = 'text-destructive dark:text-destructiveDark';
    sign = '-';
  }

  const frequencyLabels: Record<string, string> = {
    daily: 'Diariamente',
    weekly: 'Semanalmente',
    monthly: 'Mensalmente',
    yearly: 'Anualmente',
    custom_days: `A cada ${rt.customIntervalDays} dias`
  };

  return (
    <li className={`bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 ${rt.isPaused ? 'opacity-60' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex-grow">
          <div className="flex items-center space-x-3 mb-1">
            <ArrowPathIcon className={`w-5 h-5 ${rt.isPaused ? 'text-textMuted dark:text-textMutedDark' : 'text-primary dark:text-primaryDark'}`} />
            <span className={`font-semibold text-lg ${amountColor}`}>{sign}{formatCurrency(rt.amount)}</span>
            <h3 className="text-md font-medium text-textBase dark:text-textBaseDark">{rt.description}</h3>
          </div>
          <p className="text-sm text-textMuted dark:text-textMutedDark ml-8">
            {frequencyLabels[rt.frequency]} &bull; Próximo: {formatDate(rt.nextDueDate)}
            {rt.endDate && ` &bull; Termina em: ${formatDate(rt.endDate)}`}
            {rt.remainingOccurrences !== undefined && rt.occurrences && ` &bull; (${rt.remainingOccurrences}/${rt.occurrences} restantes)`}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark ml-8">
            Conta: {account?.name || 'N/A'}
            {category && ` &bull; Categoria: ${category.name}`}
            {rt.isPaused && <span className="font-semibold text-amber-600 dark:text-amber-500"> (Pausado)</span>}
          </p>
          {rt.notes && <p className="text-xs italic text-neutral dark:text-neutralDark ml-8 mt-1">Nota: {rt.notes}</p>}
        </div>
        <div className="flex space-x-2 self-end sm:self-center">
          {/* onTogglePause button can be added here if needed */}
          <Button variant="ghost" size="sm" onClick={() => onEdit(rt)} aria-label="Editar Recorrência">
            <EditIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(rt.id)} aria-label="Excluir Recorrência">
            <TrashIcon className="w-4 h-4 text-destructive dark:text-destructiveDark" />
          </Button>
        </div>
      </div>
    </li>
  );
};

export default RecurringTransactionItem;
