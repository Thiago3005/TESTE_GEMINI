
import React from 'react'; 
import { useState, useMemo }from 'react'; 
import { Transaction, Account, Category, TransactionType, InstallmentPurchase, CreditCard, MoneyBox, Loan, LoanRepayment } from '../types'; // Added Loan, LoanRepayment
import { formatCurrency, getISODateString, formatDate } from '../utils/helpers'; 
import PlusIcon from './icons/PlusIcon';
import ScaleIcon from './icons/ScaleIcon'; 
import UsersIcon from './icons/UsersIcon'; // For Loans Summary
import Button from './Button';
import CategoryChart from './CategoryChart';
import DailySummaryBarChart from './CategoryBarChart'; 
import ChartPieIcon from './icons/ChartPieIcon'; 
import BarChartIcon from './icons/BarChartIcon'; 


interface DashboardViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  creditCards: CreditCard[]; 
  installmentPurchases: InstallmentPurchase[]; 
  moneyBoxes: MoneyBox[]; 
  loans: Loan[]; // New
  loanRepayments: LoanRepayment[]; // New
  onAddTransaction: () => void;
  calculateAccountBalance: (accountId: string) => number;
  calculateMoneyBoxBalance: (moneyBoxId: string) => number; 
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    transactions, accounts, categories, creditCards, installmentPurchases, moneyBoxes,
    loans, loanRepayments, // New props
    onAddTransaction, calculateAccountBalance, calculateMoneyBoxBalance 
}) => {
  const [expenseIncomeChartType, setExpenseIncomeChartType] = useState<TransactionType.INCOME | TransactionType.EXPENSE>(TransactionType.EXPENSE);
  const [monthlyChartDisplayMode, setMonthlyChartDisplayMode] = useState<'pie' | 'bar'>('pie'); 
  const currentMonthYYYYMM = getISODateString(new Date()).substring(0, 7); // YYYY-MM

  const totalAccountBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc.id), 0);
  }, [accounts, calculateAccountBalance]);
  
  const totalMoneyBoxBalance = useMemo(() => {
    return moneyBoxes.reduce((sum, mb) => sum + calculateMoneyBoxBalance(mb.id), 0);
  }, [moneyBoxes, calculateMoneyBoxBalance]);

  const totalOutstandingCreditCardDebt = useMemo(() => {
    return installmentPurchases.reduce((totalDebt, p) => {
        if (p.installmentsPaid >= p.numberOfInstallments) return totalDebt;
        const installmentValue = p.totalAmount / p.numberOfInstallments;
        const remainingInstallments = p.numberOfInstallments - p.installmentsPaid;
        return totalDebt + (installmentValue * remainingInstallments);
    }, 0);
  }, [installmentPurchases]);

  const totalOutstandingLoanReceivables = useMemo(() => {
    return loans.reduce((total, loan) => {
      const paidForThisLoan = loanRepayments
        .filter(rp => loan.repaymentIds.includes(rp.id))
        .reduce((sum, rp) => sum + rp.amountPaid, 0);
      return total + (loan.totalAmountToReimburse - paidForThisLoan);
    }, 0);
  }, [loans, loanRepayments]);
  
  const netWorth = useMemo(() => {
    return totalAccountBalance + totalMoneyBoxBalance + totalOutstandingLoanReceivables - totalOutstandingCreditCardDebt;
  }, [totalAccountBalance, totalMoneyBoxBalance, totalOutstandingLoanReceivables, totalOutstandingCreditCardDebt]);


  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);
  
  const budgetedCategories = useMemo(() => {
    return categories.filter(c => c.type === TransactionType.EXPENSE && c.monthlyBudget && c.monthlyBudget > 0);
  }, [categories]);

  const budgetSummary = useMemo(() => {
    const totalBudgeted = budgetedCategories.reduce((sum, cat) => sum + (cat.monthlyBudget || 0), 0);
    let totalSpentInBudgetedCategories = 0;

    budgetedCategories.forEach(cat => {
        const spending = transactions
            .filter(t => t.categoryId === cat.id && t.date.startsWith(currentMonthYYYYMM) && t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);
        totalSpentInBudgetedCategories += spending;
    });
    return { totalBudgeted, totalSpentInBudgetedCategories };
  }, [budgetedCategories, transactions, currentMonthYYYYMM]);


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

      {/* Balances Summary, Loans & Net Worth */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">SALDO TOTAL (CONTAS)</h2>
          <p className={`text-3xl font-bold ${totalAccountBalance >= 0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(totalAccountBalance)}
          </p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">SALDO CAIXINHAS</h2>
          <p className={`text-3xl font-bold ${totalMoneyBoxBalance >= 0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(totalMoneyBoxBalance)}
          </p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
            <div className="flex items-center w-full justify-between">
                 <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">A RECEBER (EMPRÉSTIMOS)</h2>
                 <UsersIcon className="w-5 h-5 text-textMuted dark:text-textMutedDark" />
            </div>
          <p className={`text-3xl font-bold text-primary dark:text-primaryDark`}>
            {formatCurrency(totalOutstandingLoanReceivables)}
          </p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30 flex flex-col items-start">
            <div className="flex items-center w-full justify-between">
                 <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">PATRIMÔNIO LÍQUIDO</h2>
                 <ScaleIcon className="w-5 h-5 text-textMuted dark:text-textMutedDark" />
            </div>
          <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-primary dark:text-primaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(netWorth)}
          </p>
          <div className="text-xs mt-1 space-y-0.5">
            {totalOutstandingCreditCardDebt > 0 && (
                <p className="text-destructive dark:text-destructiveDark/80">Dívida Cartões: {formatCurrency(totalOutstandingCreditCardDebt)}</p>
            )}
            {totalOutstandingLoanReceivables > 0 && (
                 <p className="text-primary dark:text-primaryDark/80">Empréstimos a Receber: {formatCurrency(totalOutstandingLoanReceivables)}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Monthly Chart */}
      <div className="bg-surface dark:bg-surfaceDark p-4 sm:p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark">Resumo Mensal ({currentMonthYYYYMM.split('-')[1]}/{currentMonthYYYYMM.split('-')[0]})</h2>
            <div className="flex flex-wrap gap-2 items-center">
                <Button 
                    variant={expenseIncomeChartType === TransactionType.EXPENSE ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setExpenseIncomeChartType(TransactionType.EXPENSE)}
                >
                    Despesas
                </Button>
                <Button 
                    variant={expenseIncomeChartType === TransactionType.INCOME ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setExpenseIncomeChartType(TransactionType.INCOME)}
                >
                    Receitas
                </Button>
                <div className="h-6 border-l border-borderBase dark:border-borderBaseDark mx-1 sm:mx-2"></div> {/* Divider */}
                <Button 
                    variant={monthlyChartDisplayMode === 'pie' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setMonthlyChartDisplayMode('pie')}
                    className="!px-2"
                    title="Gráfico de Pizza"
                >
                    <ChartPieIcon className="w-4 h-4" />
                </Button>
                 <Button 
                    variant={monthlyChartDisplayMode === 'bar' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setMonthlyChartDisplayMode('bar')}
                    className="!px-2"
                    title="Gráfico de Barras"
                >
                    <BarChartIcon className="w-4 h-4" />
                </Button>
            </div>
        </div>
        {monthlyChartDisplayMode === 'pie' ? (
            <CategoryChart 
              transactions={transactions} 
              categories={categories.filter(c => c.type === expenseIncomeChartType)} 
              type={expenseIncomeChartType} 
              month={currentMonthYYYYMM} 
            />
        ) : (
            <DailySummaryBarChart
              transactions={transactions} 
              type={expenseIncomeChartType} 
              month={currentMonthYYYYMM} 
            />
        )}
      </div>
      
      {/* Budget Overview */}
      {budgetedCategories.length > 0 && (
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Orçamento Mensal ({currentMonthYYYYMM.split('-')[1]}/{currentMonthYYYYMM.split('-')[0]})</h2>
          <div className="mb-3">
            <div className="flex justify-between text-sm">
              <span>Total Gasto (Orçado): {formatCurrency(budgetSummary.totalSpentInBudgetedCategories)}</span>
              <span>Total Orçado: {formatCurrency(budgetSummary.totalBudgeted)}</span>
            </div>
            <div className="w-full progress-bar-bg rounded-full h-2.5 mt-1 dark:progress-bar-bg">
              <div 
                className={`h-2.5 rounded-full ${budgetSummary.totalSpentInBudgetedCategories > budgetSummary.totalBudgeted ? 'bg-destructive' : 'bg-primary dark:bg-primaryDark'}`}
                style={{ width: `${Math.min((budgetSummary.totalSpentInBudgetedCategories / budgetSummary.totalBudgeted) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {budgetedCategories.map(cat => {
                const spending = transactions
                    .filter(t => t.categoryId === cat.id && t.date.startsWith(currentMonthYYYYMM) && t.type === TransactionType.EXPENSE)
                    .reduce((sum, t) => sum + t.amount, 0);
                const progress = cat.monthlyBudget ? Math.min((spending / cat.monthlyBudget) * 100, 100) : 0;
                const isOver = cat.monthlyBudget ? spending > cat.monthlyBudget : false;
                return (
                    <li key={cat.id} className="text-sm">
                        <div className="flex justify-between">
                            <span>{cat.name}</span>
                            <span className={isOver ? 'text-destructive dark:text-destructiveDark' : ''}>{formatCurrency(spending)} / {formatCurrency(cat.monthlyBudget || 0)}</span>
                        </div>
                        <div className="w-full progress-bar-bg rounded-full h-1.5 mt-0.5 dark:progress-bar-bg">
                            <div className={`h-1.5 rounded-full ${isOver ? 'bg-destructive' : 'bg-secondary dark:bg-secondaryDark'}`} style={{ width: `${progress}%`}}></div>
                        </div>
                    </li>
                );
            })}
          </ul>
        </div>
      )}


      {/* Recent Transactions */}
      <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Transações Recentes</h2>
        {recentTransactions.length > 0 ? (
          <ul className="space-y-3">
            {recentTransactions.map(tx => {
              const account = accounts.find(a => a.id === tx.accountId);
              const category = categories.find(c => c.id === tx.categoryId);
              let txColor = 'text-textBase dark:text-textBaseDark';
              if (tx.type === TransactionType.INCOME) txColor = 'text-secondary dark:text-secondaryDark';
              else if (tx.type === TransactionType.EXPENSE) txColor = 'text-destructive dark:text-destructiveDark';
              
              let descriptionText = tx.description || (tx.type === TransactionType.TRANSFER ? 'Transferência' : category?.name) || 'Transação';
              if (tx.type === TransactionType.TRANSFER) {
                const toAccount = accounts.find(a => a.id === tx.toAccountId);
                descriptionText += ` para ${toAccount?.name || 'N/A'}`;
              }

              return (
                <li key={tx.id} className="flex justify-between items-center py-2 border-b border-borderBase/50 dark:border-borderBaseDark/50 last:border-b-0">
                  <div>
                    <p className="font-medium text-textBase dark:text-textBaseDark">{descriptionText}</p>
                    <p className="text-sm text-textMuted dark:text-textMutedDark">{account?.name} &bull; {formatDate(tx.date)}</p> 
                  </div>
                  <p className={`font-semibold ${txColor}`}>{formatCurrency(tx.amount)}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-textMuted dark:text-textMutedDark">Nenhuma transação recente.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardView;