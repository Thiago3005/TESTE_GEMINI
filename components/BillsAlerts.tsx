
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
  onViewTransaction?: (transactionId: string) => void; // Optional: for navigating to the transaction
}

const BillsAlerts: React.FC<BillsAlertsProps> = ({ recurringTransactions, accounts, categories, onViewTransaction }) => {
  const today = getISODateString(new Date());
  const upcomingLimitDate = getISODateString(new Date(new Date().setDate(new Date().getDate() + 7)));

  const activeRTs = recurringTransactions.filter(rt => 
    !rt.isPaused &&
    (!rt.endDate || rt.endDate >= today) &&
    (rt.remainingOccurrences === undefined || rt.remainingOccurrences > 0)
  );

  const overdueBills = activeRTs
    .filter(rt => rt.nextDueDate < today)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

  const upcomingBills = activeRTs
    .filter(rt => rt.nextDueDate >= today && rt.nextDueDate <= upcomingLimitDate)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

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
    const account = accounts.find(a => a.id === rt.accountId);
    const category = rt.categoryId ? categories.find(c => c.id === rt.categoryId) : null;
    const amountColor = rt.type === TransactionType.EXPENSE ? 'text-destructive dark:text-destructiveDark' : 'text-secondary dark:text-secondaryDark';
    const sign = rt.type === TransactionType.EXPENSE ? '-' : '+';

    return (
      <li 
        key={rt.id} 
        className={`p-3 rounded-md border-l-4 ${isOverdue ? 'border-destructive dark:border-destructiveDark bg-destructive/5 dark:bg-destructiveDark/10' : 'border-amber-500 dark:border-amber-400 bg-amber-500/5 dark:bg-amber-400/10'} hover:shadow-sm transition-shadow`}
        onClick={() => onViewTransaction && onViewTransaction(rt.id)} // Placeholder for future navigation
        role={onViewTransaction ? "button" : undefined}
        tabIndex={onViewTransaction ? 0 : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <div className="flex items-center space-x-2">
              {isOverdue ? <CalendarAlertIcon className="w-5 h-5 text-destructive dark:text-destructiveDark" /> : <CalendarClockIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />}
              <span className="font-medium text-textBase dark:text-textBaseDark">{rt.description}</span>
            </div>
            <p className={`text-sm ${amountColor} font-semibold`}>{sign}{formatCurrency(rt.amount)}</p>
            <p className="text-xs text-textMuted dark:text-textMutedDark">
              Vence em: {formatDate(rt.nextDueDate)}
              {account && ` • Conta: ${account.name}`}
              {category && ` • Cat: ${category.name}`}
            </p>
          </div>
          {/* Add a button or link to view/pay if needed */}
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
            <h3 className="text-md font-semibold text-destructive dark:text-destructiveDark mb-2">VENCIDAS ({overdueBills.length})</h3>
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {overdueBills.map(rt => renderBillItem(rt, true))}
            </ul>
          </div>
        )}
        {upcomingBills.length > 0 && (
          <div>
            <h3 className={`text-md font-semibold text-amber-600 dark:text-amber-500 mb-2 ${overdueBills.length > 0 ? 'mt-4' : ''}`}>
              PRÓXIMOS 7 DIAS ({upcomingBills.length})
            </h3>
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {upcomingBills.map(rt => renderBillItem(rt, false))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillsAlerts;
