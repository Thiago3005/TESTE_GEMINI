
import React from 'react'; 
import { useState, useMemo, useCallback }from 'react'; 
import { Transaction, Account, Category, TransactionType, MoneyBox, Loan, LoanRepayment, RecurringTransaction, SafeToSpendTodayState } from '../types'; 
import { formatCurrency, getISODateString, formatDate } from '../utils/helpers'; 
import PlusIcon from './icons/PlusIcon';
import ScaleIcon from './icons/ScaleIcon'; 
import UsersIcon from './icons/UsersIcon'; 
import Button from './Button';
import SparkLineChart from './SparkLineChart';
import InfoTooltip from './InfoTooltip';
import LightBulbIcon from './icons/LightBulbIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrendingUpIcon from './icons/TrendingUpIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ReallocateFundsModal from './ReallocateFundsModal';
import ArrowUpIcon from './icons/ArrowUpIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import BanknotesIcon from './icons/BanknotesIcon';
import PiggyBankIcon from './icons/PiggyBankIcon';


interface DashboardViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  moneyBoxes: MoneyBox[]; 
  loans: Loan[]; 
  loanRepayments: LoanRepayment[]; 
  recurringTransactions: RecurringTransaction[]; 
  onAddTransaction: () => void;
  calculateAccountBalance: (accountId: string) => number;
  calculateMoneyBoxBalance: (moneyBoxId: string) => number; 
  isPrivacyModeEnabled?: boolean; 
  safeToSpendToday: SafeToSpendTodayState;
  onFetchSafeToSpendToday: () => void;
  onFetchAccountBalanceInsight: () => void;
  onFetchMoneyBoxSuggestion: () => void;
  onFetchNetWorthConcentrationAlert: () => void;
  onReallocateMoneyBoxFunds: (fromId: string, toId: string, amount: number) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    transactions, accounts, categories, moneyBoxes,
    loans, loanRepayments, recurringTransactions, 
    onAddTransaction, calculateAccountBalance, calculateMoneyBoxBalance,
    isPrivacyModeEnabled,
    safeToSpendToday, 
    onFetchSafeToSpendToday, 
    onFetchAccountBalanceInsight,
    onFetchMoneyBoxSuggestion,
    onFetchNetWorthConcentrationAlert,
    onReallocateMoneyBoxFunds
}) => {
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const currentMonthYYYYMM = getISODateString(new Date()).substring(0, 7); 
  const lastMonthDate = new Date();
  lastMonthDate.setDate(0); // Go to last day of previous month
  const lastMonthYYYYMM = getISODateString(lastMonthDate).substring(0, 7);


  // Memoized KPIs
  const totalAccountBalance = useMemo(() => accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc.id), 0), [accounts, calculateAccountBalance]);
  const totalMoneyBoxBalance = useMemo(() => moneyBoxes.reduce((sum, mb) => sum + calculateMoneyBoxBalance(mb.id), 0), [moneyBoxes, calculateMoneyBoxBalance]);
  const totalLoanReceivables = useMemo(() => loans.reduce((sum, loan) => sum + (loan.total_amount_to_reimburse - loanRepayments.filter(rp => rp.loan_id === loan.id).reduce((s, rp) => s + rp.amount_paid, 0)), 0), [loans, loanRepayments]);
  
  const calculateNetWorth = useCallback((targetMonth?: string) => {
    const targetTransactions = targetMonth ? transactions.filter(t => t.date.substring(0, 7) <= targetMonth) : transactions;
    const initialAccountBalance = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);

    const balanceAtDate = targetTransactions.reduce((balance, tx) => {
        if (tx.type === TransactionType.INCOME) return balance + tx.amount;
        if (tx.type === TransactionType.EXPENSE) return balance - tx.amount;
        return balance;
    }, initialAccountBalance);

    // This is a simplified net worth calculation for demonstration.
    // A more accurate one would require historical snapshots of all asset/liability types.
    return balanceAtDate + totalMoneyBoxBalance + totalLoanReceivables; // simplified for now
  }, [transactions, accounts, totalMoneyBoxBalance, totalLoanReceivables]);

  const currentNetWorth = useMemo(() => calculateNetWorth(), [calculateNetWorth]);
  const lastMonthNetWorth = useMemo(() => calculateNetWorth(lastMonthYYYYMM), [calculateNetWorth, lastMonthYYYYMM]);
  
  const netWorthChange = useMemo(() => {
    if (lastMonthNetWorth === 0) return currentNetWorth > 0 ? 100 : 0;
    return ((currentNetWorth - lastMonthNetWorth) / Math.abs(lastMonthNetWorth)) * 100;
  }, [currentNetWorth, lastMonthNetWorth]);


  const upcomingTransactions = useMemo(() => {
    const today = new Date();
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + 7);
    return recurringTransactions
        .filter(rt => !rt.is_paused && new Date(rt.next_due_date) >= today && new Date(rt.next_due_date) <= limitDate)
        .sort((a,b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
  }, [recurringTransactions]);

  const balanceForecast = useMemo(() => {
    let forecast = [{ date: 'Hoje', balance: totalAccountBalance }];
    let currentBalance = totalAccountBalance;
    for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = getISODateString(date);
        const dailyNet = upcomingTransactions
            .filter(rt => rt.next_due_date === dateStr)
            .reduce((sum, rt) => rt.type === TransactionType.INCOME ? sum + rt.amount : sum - rt.amount, 0);
        currentBalance += dailyNet;
        forecast.push({ date: formatDate(dateStr, 'pt-BR', { day: 'numeric', month: 'short'}), balance: currentBalance });
    }
    return forecast;
  }, [totalAccountBalance, upcomingTransactions]);

  const moneyBoxDetails = useMemo(() => {
      return moneyBoxes.map(mb => {
          const balance = calculateMoneyBoxBalance(mb.id);
          let completionDate = 'N/A';
          if (mb.goal_amount && balance < mb.goal_amount) {
              const deposits = transactions.filter(t => t.description?.includes(mb.name) && t.type === TransactionType.EXPENSE); // Simplified
              const avgMonthlyDeposit = deposits.reduce((sum, d) => sum + d.amount, 0) / (deposits.length || 1);
              if (avgMonthlyDeposit > 0) {
                  const monthsRemaining = (mb.goal_amount - balance) / avgMonthlyDeposit;
                  const targetDate = new Date();
                  targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsRemaining));
                  completionDate = formatDate(getISODateString(targetDate), 'pt-BR', { month: 'long', year: 'numeric' });
              }
          }
          return { ...mb, balance, completionDate };
      });
  }, [moneyBoxes, calculateMoneyBoxBalance, transactions]);


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Painel Geral</h1>
          <p className="text-textMuted dark:text-textMutedDark">Bem-vindo(a) de volta!</p>
        </div>
        <Button onClick={onAddTransaction} variant="primary" size="lg">
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Transação
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Safe to Spend Card */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <div className="flex items-center justify-between mb-2 gap-1">
              <div className="flex items-center space-x-1.5">
                  <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">GASTAR HOJE (IA)</h2>
                  <InfoTooltip text="Sugestão de valor para gastos variáveis hoje, considerando seus saldos, despesas fixas futuras e orçamentos essenciais." />
              </div>
              <Button onClick={onFetchSafeToSpendToday} variant="ghost" size="sm" disabled={safeToSpendToday.isLoading} className="!text-xs !py-1 !px-2" title="Recalcular sugestão da IA">
                  <ArrowPathIcon className={`w-3 h-3 mr-1 ${safeToSpendToday.isLoading ? 'animate-spin' : ''}`} />
                  {safeToSpendToday.isLoading ? '...' : 'Recalcular'}
              </Button>
          </div>
          <p className={`text-3xl font-bold text-center my-2 ${safeToSpendToday.safeAmount !== null && safeToSpendToday.safeAmount > 0 ? 'text-green-600 dark:text-green-500' : 'text-amber-500 dark:text-amber-400'}`}>
              {safeToSpendToday.safeAmount !== null ? formatCurrency(safeToSpendToday.safeAmount, 'BRL', 'pt-BR', isPrivacyModeEnabled) : (isPrivacyModeEnabled ? formatCurrency(0,'BRL','pt-BR', true) : '---')}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark text-center break-words min-h-[28px] leading-tight">
              {safeToSpendToday.isLoading ? 'Calculando...' : safeToSpendToday.explanation}
          </p>
        </div>
        {/* Account Balance Card */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30 md:col-span-2 lg:col-span-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark uppercase">Saldo em Contas</h2>
                    <InfoTooltip text="Soma de todas as suas contas correntes e poupança." />
                </div>
                 <Button onClick={onFetchAccountBalanceInsight} variant="ghost" size="sm" className="!p-1" title="Obter Insight da IA"><SparklesIcon className="w-4 h-4 text-teal-400"/></Button>
            </div>
            <p className={`text-3xl font-bold ${totalAccountBalance >= 0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
                {formatCurrency(totalAccountBalance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
            </p>
             <div className="mt-2">
                {!isPrivacyModeEnabled && <SparkLineChart data={balanceForecast} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
                <ul className="text-xs mt-2 space-y-1">
                {upcomingTransactions.slice(0, 2).map(rt => (
                    <li key={rt.id} className={`flex justify-between items-center ${rt.type === 'INCOME' ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-400'}`}>
                    <span>{rt.description} ({formatDate(rt.next_due_date, 'pt-BR', {day: '2-digit', month:'2-digit'})})</span>
                    <span>{formatCurrency(rt.amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
                    </li>
                ))}
                </ul>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Money Boxes Card */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30 md:col-span-2 lg:col-span-2">
           <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark uppercase">Caixinhas (Metas)</h2>
                    <InfoTooltip text="Suas metas de economia e o progresso de cada uma." />
                </div>
                 <div className="flex gap-2">
                    <Button onClick={() => setIsReallocateModalOpen(true)} variant="ghost" size="sm" className="!p-1.5 !text-xs" title="Realocar fundos entre caixinhas">Realocar</Button>
                    <Button onClick={onFetchMoneyBoxSuggestion} variant="ghost" size="sm" className="!p-1" title="Obter Sugestão da IA"><SparklesIcon className="w-4 h-4 text-teal-400"/></Button>
                </div>
            </div>
            <div className="space-y-3">
            {moneyBoxDetails.length > 0 ? moneyBoxDetails.map(mb => (
                <div key={mb.id} className="text-sm">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-textBase dark:text-textBaseDark flex items-center"><PiggyBankIcon className="w-4 h-4 mr-2" style={{color: mb.color}}/>{mb.name}</span>
                        <span className="font-medium" style={{color: mb.color}}>{formatCurrency(mb.balance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
                    </div>
                    {mb.goal_amount && mb.goal_amount > 0 && (
                        <>
                         <div className="w-full progress-bar-bg rounded-full h-1.5 mt-1 dark:progress-bar-bg">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (mb.balance/mb.goal_amount)*100)}%`, backgroundColor: mb.color }}></div>
                         </div>
                         <div className="flex justify-between text-xs text-textMuted dark:text-textMutedDark mt-0.5">
                            <span>Meta: {formatCurrency(mb.goal_amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
                            <span>Prev: {mb.completionDate}</span>
                         </div>
                        </>
                    )}
                </div>
            )) : <p className="text-xs text-textMuted dark:text-textMutedDark text-center py-4">Nenhuma caixinha criada.</p>}
            </div>
        </div>
        {/* Net Worth Card */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
           <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark uppercase">Patrimônio Líquido</h2>
                    <InfoTooltip text="Seus ativos (o que você tem) menos seus passivos (o que você deve)." />
                </div>
                <Button onClick={onFetchNetWorthConcentrationAlert} variant="ghost" size="sm" className="!p-1" title="Obter Insight da IA"><SparklesIcon className="w-4 h-4 text-teal-400"/></Button>
            </div>
             <p className={`text-3xl font-bold ${currentNetWorth >= 0 ? 'text-primary dark:text-primaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
                {formatCurrency(currentNetWorth, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
            </p>
            {lastMonthNetWorth !== 0 && (
                 <div className={`flex items-center text-sm font-semibold ${netWorthChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {netWorthChange >= 0 ? <ArrowUpIcon className="w-4 h-4"/> : <ArrowDownIcon className="w-4 h-4"/>}
                    <span>{Math.abs(netWorthChange).toFixed(1)}%</span>
                    <span className="text-xs font-normal text-textMuted dark:text-textMutedDark ml-1">vs. mês passado</span>
                </div>
            )}
            <div className="text-xs mt-2 space-y-2 pt-2 border-t border-borderBase/50 dark:border-borderBaseDark/50">
                 <div className="flex justify-between"><span><BanknotesIcon className="w-3 h-3 inline mr-1"/>Ativos</span><span className="font-semibold">{formatCurrency(totalAccountBalance + totalMoneyBoxBalance + totalLoanReceivables, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span></div>
                 <div className="flex justify-between text-destructive/80 dark:text-destructiveDark/80"><span><ScaleIcon className="w-3 h-3 inline mr-1"/>Passivos</span><span className="font-semibold">{formatCurrency(0, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span></div>
            </div>
        </div>
      </div>
       {isReallocateModalOpen && (
        <ReallocateFundsModal 
            isOpen={isReallocateModalOpen}
            onClose={() => setIsReallocateModalOpen(false)}
            moneyBoxes={moneyBoxes}
            onConfirmReallocation={onReallocateMoneyBoxFunds}
            calculateMoneyBoxBalance={calculateMoneyBoxBalance}
            isPrivacyModeEnabled={isPrivacyModeEnabled}
        />
       )}
    </div>
  );
};

export default DashboardView;
