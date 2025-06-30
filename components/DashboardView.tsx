
import React from 'react'; 
import { useMemo } from 'react'; 
import { Transaction, Account, Category, TransactionType, MoneyBox, Loan, LoanRepayment, RecurringTransaction, SafeToSpendTodayState, InstallmentPurchase, CreditCard, Tag } from '../types'; 
import { formatCurrency, getISODateString, formatDate, daysUntil } from '../utils/helpers'; 
import PlusIcon from './icons/PlusIcon';
import Button from './Button';
import InfoTooltip from './InfoTooltip';
import ArrowPathIcon from './icons/ArrowPathIcon';
import TransactionItem from './TransactionItem';

// New Components for the dashboard
import BillsAlerts from './BillsAlerts';
import MonthlySummary from './MonthlySummary';


interface DashboardViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  creditCards: CreditCard[];
  installmentPurchases: InstallmentPurchase[];
  moneyBoxes: MoneyBox[]; 
  loans: Loan[]; 
  loanRepayments: LoanRepayment[]; 
  recurringTransactions: RecurringTransaction[]; 
  tags: Tag[];
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  calculateAccountBalance: (accountId: string) => number;
  calculateMoneyBoxBalance: (moneyBoxId: string) => number; 
  isPrivacyModeEnabled?: boolean; 
  safeToSpendToday: SafeToSpendTodayState;
  onFetchSafeToSpendToday: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    transactions, accounts, categories, creditCards, installmentPurchases, moneyBoxes,
    loans, loanRepayments, recurringTransactions, tags,
    onAddTransaction, onEditTransaction, onDeleteTransaction, 
    calculateAccountBalance, calculateMoneyBoxBalance,
    isPrivacyModeEnabled,
    safeToSpendToday, 
    onFetchSafeToSpendToday, 
}) => {

  // Memoized KPIs
  const totalAccountBalance = useMemo(() => accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc.id), 0), [accounts, calculateAccountBalance]);
  const totalMoneyBoxBalance = useMemo(() => moneyBoxes.reduce((sum, mb) => sum + calculateMoneyBoxBalance(mb.id), 0), [moneyBoxes, calculateMoneyBoxBalance]);
  
  const activeLoans = useMemo(() => loans.filter(loan => {
      const totalPaid = loanRepayments.filter(rp => rp.loan_id === loan.id).reduce((s, rp) => s + rp.amount_paid, 0);
      return totalPaid < loan.total_amount_to_reimburse;
  }), [loans, loanRepayments]);

  const totalLoanReceivables = useMemo(() => activeLoans.reduce((sum, loan) => sum + (loan.total_amount_to_reimburse - loanRepayments.filter(rp => rp.loan_id === loan.id).reduce((s, rp) => s + rp.amount_paid, 0)), 0), [activeLoans, loanRepayments]);

  const totalCreditCardDebt = useMemo(() => {
      return installmentPurchases.reduce((sum, p) => {
        if (p.installments_paid >= p.number_of_installments) return sum;
        const installmentValue = p.total_amount / p.number_of_installments;
        const remainingInstallments = p.number_of_installments - p.installments_paid;
        return sum + (installmentValue * remainingInstallments);
      }, 0);
  }, [installmentPurchases]);
  
  const netWorth = useMemo(() => {
      const totalAssets = totalAccountBalance + totalMoneyBoxBalance + totalLoanReceivables;
      const totalLiabilities = totalCreditCardDebt; // Can be expanded with Debts module
      return totalAssets - totalLiabilities;
  }, [totalAccountBalance, totalMoneyBoxBalance, totalLoanReceivables, totalCreditCardDebt]);
  
  const nextUpcomingIncome = useMemo(() => {
    const today = getISODateString();
    const futureIncomes = recurringTransactions
        .filter(rt => rt.type === TransactionType.INCOME && !rt.is_paused && rt.next_due_date >= today)
        .sort((a,b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
    
    if (futureIncomes.length > 0) {
        const nextIncome = futureIncomes[0];
        const days = daysUntil(nextIncome.next_due_date);
        return { amount: nextIncome.amount, days: days };
    }
    return null;
  }, [recurringTransactions]);
  
   const closestMoneyBoxGoal = useMemo(() => {
    let closestGoal: { name: string, remaining: number } | null = null;
    let minRemaining = Infinity;

    moneyBoxes.forEach(mb => {
      if (mb.goal_amount && mb.goal_amount > 0) {
        const balance = calculateMoneyBoxBalance(mb.id);
        const remaining = mb.goal_amount - balance;
        if (remaining > 0 && remaining < minRemaining) {
          minRemaining = remaining;
          closestGoal = { name: mb.name, remaining: remaining };
        }
      }
    });

    return closestGoal;
  }, [moneyBoxes, calculateMoneyBoxBalance]);
  
  const budgetSummary = useMemo(() => {
    const expenseCategoriesWithBudget = categories.filter(c => 
        c.type === TransactionType.EXPENSE && 
        c.monthly_budget && 
        c.monthly_budget > 0
    );

    if (expenseCategoriesWithBudget.length === 0) return [];
    
    const currentMonthYYYYMM = getISODateString().substring(0, 7);
    const currentMonthTransactions = transactions.filter(t => 
        t.date.startsWith(currentMonthYYYYMM) && 
        t.type === TransactionType.EXPENSE
    );

    return expenseCategoriesWithBudget.map(category => {
        const spending = currentMonthTransactions
            .filter(t => t.category_id === category.id)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const budget = category.monthly_budget!;
        const progress = budget > 0 ? Math.min((spending / budget) * 100, 100) : 0;
        const isOverBudget = spending > budget;

        return {
            categoryId: category.id,
            categoryName: category.name,
            spending,
            budget,
            progress,
            isOverBudget
        };
    }).sort((a, b) => (b.spending / b.budget) - (a.spending / a.budget)); // Sort by most spent %
  }, [categories, transactions]);

  const recentTransactions = useMemo(() => {
      return [...transactions]
          .sort((a, b) => {
              const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
              if (dateComparison !== 0) return dateComparison;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
          .slice(0, 5);
  }, [transactions]);


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Painel Geral</h1>
          <p className="text-textMuted dark:text-textMutedDark">Bem-vindo ao seu controle financeiro.</p>
        </div>
        <Button onClick={onAddTransaction} variant="primary" size="lg">
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Transação
        </Button>
      </div>
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Safe to Spend */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <div className="flex items-center justify-between gap-1">
            <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark flex items-center">
              GASTAR HOJE (IA)
              <InfoTooltip text="Sugestão de valor para gastos variáveis hoje, considerando seus saldos, despesas fixas futuras e orçamentos essenciais." />
            </h2>
            <Button onClick={onFetchSafeToSpendToday} variant="ghost" size="sm" disabled={safeToSpendToday.isLoading} className="!text-xs !py-0.5 !px-1.5" title="Recalcular sugestão da IA">
              <ArrowPathIcon className={`w-3 h-3 mr-1 ${safeToSpendToday.isLoading ? 'animate-spin' : ''}`} /> Recalcular
            </Button>
          </div>
          <p className={`text-3xl font-bold ${safeToSpendToday.safeAmount && safeToSpendToday.safeAmount > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {safeToSpendToday.safeAmount !== null ? formatCurrency(safeToSpendToday.safeAmount, 'BRL', 'pt-BR', isPrivacyModeEnabled) : (isPrivacyModeEnabled ? 'R$ ***' : 'R$ 0,00')}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark min-h-[42px]">
            {safeToSpendToday.isLoading ? 'Calculando...' : safeToSpendToday.explanation || 'Sugestão da IA. Use com discernimento.'}
          </p>
        </div>
        {/* Account Balance */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">SALDO EM CONTAS</h2>
          <p className={`text-3xl font-bold ${totalAccountBalance >= 0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(totalAccountBalance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
           <p className="text-xs text-textMuted dark:text-textMutedDark min-h-[42px]">
            {nextUpcomingIncome ? `Próxima receita: +${formatCurrency(nextUpcomingIncome.amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)} em ${nextUpcomingIncome.days} dia(s)` : 'Nenhuma receita recorrente prevista.'}
          </p>
        </div>
        {/* Money Boxes */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">SALDO CAIXINHAS</h2>
          <p className="text-3xl font-bold text-primary dark:text-primaryDark">
            {formatCurrency(totalMoneyBoxBalance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
           <p className="text-xs text-textMuted dark:text-textMutedDark min-h-[42px]">
            {closestMoneyBoxGoal ? `Faltam ${formatCurrency(closestMoneyBoxGoal.remaining, 'BRL', 'pt-BR', isPrivacyModeEnabled)} para "${closestMoneyBoxGoal.name}"` : 'Nenhuma meta ativa.'}
          </p>
        </div>
        {/* Net Worth */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">PATRIMÔNIO LÍQUIDO</h2>
          <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-textBase dark:text-textBaseDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(netWorth, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
           <div className="text-xs text-textMuted dark:text-textMutedDark min-h-[42px] space-y-0.5">
            <p className="text-red-500">Dívida Cartões: {formatCurrency(totalCreditCardDebt, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
            <p className="text-green-500">Empréstimos a Receber: {formatCurrency(totalLoanReceivables, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
           </div>
        </div>
      </div>

      {/* Loan Receivables */}
      <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
        <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">A RECEBER (EMPRÉSTIMOS) ({activeLoans.length})</h2>
        <p className="text-3xl font-bold text-green-500">
            {formatCurrency(totalLoanReceivables, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
        </p>
      </div>

      {/* Bills Alerts */}
      <BillsAlerts 
        recurringTransactions={recurringTransactions}
        accounts={accounts}
        categories={categories}
        isPrivacyModeEnabled={isPrivacyModeEnabled}
      />
      
      {/* Monthly Summary */}
      <MonthlySummary
        transactions={transactions}
        categories={categories}
        isPrivacyModeEnabled={isPrivacyModeEnabled}
      />

      {/* Budget Tracking */}
      {budgetSummary.length > 0 && (
        <div className="bg-surface dark:bg-surfaceDark p-4 sm:p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Acompanhamento de Orçamento</h2>
          <ul className="space-y-4">
            {budgetSummary.map(item => (
              <li key={item.categoryId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-textBase dark:text-textBaseDark">{item.categoryName}</span>
                  <span className={`font-semibold ${item.isOverBudget ? 'text-destructive dark:text-destructiveDark' : 'text-textMuted dark:text-textMutedDark'}`}>
                    {formatCurrency(item.spending, 'BRL', 'pt-BR', isPrivacyModeEnabled)} / {formatCurrency(item.budget, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
                  </span>
                </div>
                <div className="w-full bg-neutral/10 dark:bg-neutralDark/20 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${item.isOverBudget ? 'bg-destructive dark:bg-destructiveDark' : 'bg-primary dark:bg-primaryDark'}`}
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
                {item.isOverBudget && <p className="text-xs text-destructive dark:text-destructiveDark text-right mt-1">Orçamento excedido!</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-surface dark:bg-surfaceDark p-4 sm:p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Transações Recentes</h2>
          <ul className="space-y-3">
            {recentTransactions.map(tx => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                accounts={accounts}
                categories={categories}
                tags={tags}
                installmentPurchases={installmentPurchases}
                onEdit={() => onEditTransaction(tx)}
                onDelete={() => onDeleteTransaction(tx.id)}
                isPrivacyModeEnabled={isPrivacyModeEnabled}
              />
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};

export default DashboardView;
