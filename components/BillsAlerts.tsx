
import React from 'react';
import { RecurringTransaction, Account, Category, TransactionType } from '../types';
import { formatDate, formatCurrency, getISODateString } from '../utils/helpers';
import CalendarAlertIcon from './icons/CalendarAlertIcon';
import CalendarClockIcon from './icons/CalendarClockIcon';
import BellAlertIcon from './icons/BellAlertIcon';

interface BillsAlertsProps {
  recurringTransactions: RecurringTransaction[];
  accounts: Account[];
  categories: Category[];
  onViewTransaction?: (transactionId: string) => void; 
  isPrivacyModeEnabled?: boolean;
}

const BillsAlerts: React.FC<BillsAlertsProps> = ({ 
  recurringTransactions, accounts, categories, onViewTransaction, isPrivacyModeEnabled 
}) => {
  const today = getISODateString(new Date());
  const upcomingLimitDate = getISODateString(new Date(new Date().setDate(new Date().getDate() + 7)));

  const activeRTs = recurringTransactions.filter(rt => 
    !rt.is_paused &&
    (!rt.end_date || rt.end_date >= today) &&
    (rt.remaining_occurrences === undefined || rt.remaining_occurrences > 0)
  );

  const overdueBills = activeRTs
    .filter(rt => rt.next_due_date < today)
    .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

  const upcomingBills = activeRTs
    .filter(rt => rt.next_due_date >= today && rt.next_due_date <= upcomingLimitDate)
    .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

  if (overdueBills.length === 0 && upcomingBills.length === 0) {
    return (
      <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
        <div className="flex items-center mb-3">
          <BellAlertIcon className="w-6 h-6 text-secondary dark:text-secondaryDark mr-2" />
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark">Alertas de Contas</h2>
        </div>
        <p className="text-sm text-textMuted dark:text-textMutedDark text-center py-3">Nenhuma conta vencida ou próxima do vencimento. Tudo em dia!</p>
      </div>
    );
  }

  const renderBillItem = (rt: RecurringTransaction, isOverdue: boolean) => {
    const account = accounts.find(a => a.id === rt.account_id);
    const category = rt.category_id ? categories.find(c => c.id === rt.category_id) : null;
    const amountColor = rt.type === TransactionType.EXPENSE ? 'text-destructive dark:text-destructiveDark' : 'text-secondary dark:text-secondaryDark';
    const sign = rt.type === TransactionType.EXPENSE ? '-' : '+';

    return (
      <li 
        key={rt.id} 
        className={`p-3 rounded-md border-l-4 ${isOverdue ? 'border-destructive dark:border-destructiveDark bg-destructive/5 dark:bg-destructiveDark/10' : 'border-amber-500 dark:border-amber-400 bg-amber-500/5 dark:bg-amber-400/10'} hover:shadow-sm transition-shadow`}
        onClick={() => onViewTransaction && onViewTransaction(rt.id)} 
        role={onViewTransaction ? "button" : undefined}
        tabIndex={onViewTransaction ? 0 : undefined}
        aria-label={`Ver detalhes de ${rt.description}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <div className="flex items-center space-x-2">
              {isOverdue ? 
                <CalendarAlertIcon className="w-5 h-5 text-destructive dark:text-destructiveDark flex-shrink-0" /> : 
                <CalendarClockIcon className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              }
              <span className="font-semibold text-textBase dark:text-textBaseDark">{rt.description}</span>
            </div>
            <p className="text-sm text-textMuted dark:text-textMutedDark ml-7">
              Vence em: {formatDate(rt.next_due_date)}
              {account && ` (${account.name})`}
              {category && ` - ${category.name}`}
            </p>
          </div>
          <span className={`text-md font-bold ${amountColor}`}>
            {sign}{formatCurrency(rt.amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </span>
        </div>
      </li>
    );
  };

  return (
    <div className="bg-surface dark:bg-surfaceDark p-4 sm:p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
      <div className="flex items-center mb-4">
        <BellAlertIcon className="w-6 h-6 text-primary dark:text-primaryDark mr-2" />
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark">Alertas de Contas</h2>
      </div>
      <div className="space-y-4">
        {overdueBills.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-destructive dark:text-destructiveDark mb-2">Vencidas ({overdueBills.length})</h3>
            <ul className="space-y-2">
              {overdueBills.map(rt => renderBillItem(rt, true))}
            </ul>
          </div>
        )}
        {upcomingBills.length > 0 && (
          <div>
            <h3 className={`text-md font-semibold text-amber-600 dark:text-amber-500 mb-2 ${overdueBills.length > 0 ? 'mt-4' : ''}`}>
              Próximas (7 dias) ({upcomingBills.length})
            </h3>
            <ul className="space-y-2">
              {upcomingBills.map(rt => renderBillItem(rt, false))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillsAlerts;
    