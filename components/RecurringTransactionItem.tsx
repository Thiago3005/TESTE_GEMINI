
import React from 'react';
import { RecurringTransaction, TransactionType, Account, Category, CreditCard } from '../types'; // Added CreditCard
import { formatDate, formatCurrency } from '../utils/helpers';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import ArrowPathIcon from './icons/ArrowPathIcon'; 

interface RecurringTransactionItemProps {
  rt: RecurringTransaction;
  accounts: Account[];
  creditCards: CreditCard[]; // Added creditCards
  categories: Category[];
  onEdit: (rt: RecurringTransaction) => void;
  onDelete: (rtId: string) => void;
  onTogglePause?: (rtId: string) => void; 
  isPrivacyModeEnabled?: boolean; 
}

const RecurringTransactionItem: React.FC<RecurringTransactionItemProps> = ({ 
    rt, accounts, creditCards, categories, onEdit, onDelete, onTogglePause, isPrivacyModeEnabled
}) => {
  // Find source in accounts or credit cards
  let sourceName = 'N/A';
  const accountSource = accounts.find(a => a.id === rt.account_id);
  if (accountSource) {
    sourceName = `Conta: ${accountSource.name}`;
  } else {
    const cardSource = creditCards.find(cc => cc.id === rt.account_id);
    if (cardSource) {
      sourceName = `Cartão: ${cardSource.name}`;
    }
  }
  
  const category = rt.category_id ? categories.find(c => c.id === rt.category_id) : null;

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
    custom_days: `A cada ${rt.custom_interval_days || '?'} dias`
  };

  return (
    <li className={`bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 ${rt.is_paused ? 'opacity-60' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex-grow">
          <div className="flex items-center space-x-3 mb-1">
            <ArrowPathIcon className={`w-5 h-5 ${rt.is_paused ? 'text-textMuted dark:text-textMutedDark' : 'text-primary dark:text-primaryDark'}`} />
            <span className={`font-semibold text-lg ${amountColor}`}>{sign}{formatCurrency(rt.amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
            <h3 className="text-md font-medium text-textBase dark:text-textBaseDark">{rt.description}</h3>
          </div>
          <p className="text-sm text-textMuted dark:text-textMutedDark ml-8">
            {frequencyLabels[rt.frequency]} &bull; Próximo: {formatDate(rt.next_due_date)}
            {rt.end_date && ` &bull; Termina em: ${formatDate(rt.end_date)}`}
            {rt.remaining_occurrences !== undefined && rt.occurrences && ` &bull; (${rt.remaining_occurrences}/${rt.occurrences} restantes)`}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark ml-8">
            Origem: {sourceName}
            {category && ` &bull; Categoria: ${category.name}`}
            {rt.is_paused && <span className="font-semibold text-amber-600 dark:text-amber-500"> (Pausado)</span>}
          </p>
          {rt.notes && <p className="text-xs italic text-neutral dark:text-neutralDark ml-8 mt-1">Nota: {rt.notes}</p>}
        </div>
        <div className="flex space-x-2 self-end sm:self-center">
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
