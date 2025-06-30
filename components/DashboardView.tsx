






import React from 'react'; 
import { useState, useMemo }from 'react'; 
import { Transaction, Account, Category, TransactionType, InstallmentPurchase, CreditCard, MoneyBox, Loan, LoanRepayment, RecurringTransaction, SafeToSpendTodayState } from '../types'; 
import { formatCurrency, getISODateString, formatDate } from '../utils/helpers'; 
import PlusIcon from './icons/PlusIcon';
import ScaleIcon from './icons/ScaleIcon'; 
import UsersIcon from './icons/UsersIcon'; 
import Button from './Button';
import CategoryChart from './CategoryChart';
import DailySummaryBarChart from './CategoryBarChart'; 
import ChartPieIcon from './icons/ChartPieIcon'; 
import BarChartIcon from './icons/BarChartIcon'; 
import BillsAlerts from './BillsAlerts'; 
import LightBulbIcon from './icons/LightBulbIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrendingUpIcon from './icons/TrendingUpIcon'; 
import TrendingDownIcon from './icons/TrendingDownIcon';
import ArrowPathIcon from './icons/ArrowPathIcon'; // For recalculate button
import InfoTooltip from './InfoTooltip';
import { LineChart, Line, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';


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
  onAddTransaction: () => void;
  calculateAccountBalance: (accountId: string) => number;
  calculateMoneyBoxBalance: (moneyBoxId: string) => number; 
  onViewRecurringTransaction?: (transactionId: string) => void; 
  isPrivacyModeEnabled?: boolean; 
  onFetchGeneralAdvice: () => void;
  onFetchSavingOpportunities: () => void;
  safeToSpendToday: SafeToSpendTodayState; // New prop
  onFetchSafeToSpendToday: () => void; // New prop
}

const MiniChartTooltip = ({ active, payload, label, formatter, name }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface dark:bg-surfaceDark/90 p-2 border border-borderBase dark:border-borderBaseDark rounded shadow-lg text-xs backdrop-blur-sm">
          <p className="font-semibold">{label}</p>
          <p style={{ color: payload[0].color }}>{`${name}: ${formatter(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };


const DashboardView: React.FC<DashboardViewProps> = ({ 
    transactions, accounts, categories, creditCards, installmentPurchases, moneyBoxes,
    loans, loanRepayments, recurringTransactions, 
    onAddTransaction, calculateAccountBalance, calculateMoneyBoxBalance, onViewRecurringTransaction,
    isPrivacyModeEnabled,
    onFetchGeneralAdvice,
    onFetchSavingOpportunities,
    safeToSpendToday, 
    onFetchSafeToSpendToday, 
}) => {
  const [expenseIncomeChartType, setExpenseIncomeChartType] = useState<TransactionType.INCOME | TransactionType.EXPENSE>(TransactionType.EXPENSE);
  const [monthlyChartDisplayMode, setMonthlyChartDisplayMode] = useState<'pie' | 'bar'>('bar'); 
  const currentMonthYYYYMM = getISODateString(new Date()).substring(0, 7); 

  const totalAccountBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc.id), 0);
  }, [accounts, calculateAccountBalance]);
  
  const totalMoneyBoxBalance = useMemo(() => {
    return moneyBoxes.reduce((sum, mb) => sum + calculateMoneyBoxBalance(mb.id), 0);
  }, [moneyBoxes, calculateMoneyBoxBalance]);

  const totalOutstandingCreditCardDebt = useMemo(() => {
    return installmentPurchases.reduce((totalDebt, p) => {
        if (p.installments_paid >= p.number_of_installments) return totalDebt;
        const installmentValue = p.total_amount / p.number_of_installments;
        const remainingInstallments = p.number_of_installments - p.installments_paid;
        return totalDebt + (installmentValue * remainingInstallments);
    }, 0);
  }, [installmentPurchases]);

  const outstandingLoans = useMemo(() => {
    return loans.map(loan => {
      const paidForThisLoan = loanRepayments
        .filter(rp => rp.loan_id === loan.id)
        .reduce((sum, rp) => sum + rp.amount_paid, 0);
      return {
        ...loan,
        outstandingBalance: loan.total_amount_to_reimburse - paidForThisLoan
      };
    }).filter(l => l.outstandingBalance > 0.01);
  }, [loans, loanRepayments]);

  const totalOutstandingLoanReceivables = useMemo(() => {
    return outstandingLoans.reduce((total, loan) => total + loan.outstandingBalance, 0);
  }, [outstandingLoans]);
  
  const netWorth = useMemo(() => {
    return totalAccountBalance + totalMoneyBoxBalance + totalOutstandingLoanReceivables - totalOutstandingCreditCardDebt;
  }, [totalAccountBalance, totalMoneyBoxBalance, totalOutstandingLoanReceivables, totalOutstandingCreditCardDebt]);

  const upcomingTransactions = useMemo(() => {
    const today = new Date();
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + 7);
    today.setHours(0,0,0,0);
    
    return recurringTransactions
        .filter(rt => !rt.is_paused && new Date(rt.next_due_date + 'T00:00:00') >= today && new Date(rt.next_due_date + 'T00:00:00') <= limitDate)
        .sort((a,b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
  }, [recurringTransactions]);

  const balanceProjectionData = useMemo(() => {
    let balance = totalAccountBalance;
    const projection: { day: string, balance: number }[] = [{ day: 'Hoje', balance }];
    
    for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = getISODateString(date);
        
        const txsOnThisDay = upcomingTransactions.filter(rt => rt.next_due_date === dateStr);
        for (const tx of txsOnThisDay) {
            if (tx.type === TransactionType.INCOME) {
                balance += tx.amount;
            } else { // EXPENSE, and TRANSFER is from an account so it's a debit
                balance -= tx.amount;
            }
        }
        projection.push({ day: `D+${i}`, balance });
    }
    return projection;
  }, [totalAccountBalance, upcomingTransactions]);
  
  const netWorthCalculations = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const startOfMonthStr = getISODateString(startOfMonth);
    
    const netFlowThisMonth = transactions
        .filter(t => t.date >= startOfMonthStr)
        .reduce((sum, t) => {
            if (t.type === TransactionType.INCOME) return sum + t.amount;
            if (t.type === TransactionType.EXPENSE) return sum - t.amount;
            return sum;
        }, 0);

    const netWorthAtStartOfMonth = netWorth - netFlowThisMonth;
    
    let changePercentage = 0;
    if (netWorthAtStartOfMonth !== 0 && netWorthAtStartOfMonth) { // check for NaN/null/undefined
        changePercentage = ((netWorth - netWorthAtStartOfMonth) / Math.abs(netWorthAtStartOfMonth)) * 100;
    } else if (netWorth > 0) {
        changePercentage = 100;
    }
    
    const totalAssets = totalAccountBalance + totalMoneyBoxBalance + totalOutstandingLoanReceivables;
    let loanConcentration = 0;
    if (totalAssets > 0) {
        loanConcentration = (totalOutstandingLoanReceivables / totalAssets) * 100;
    }
    
    return {
        changePercentage,
        showLiquidityAlert: loanConcentration > 80,
        totalAssets,
        totalLiabilities: totalOutstandingCreditCardDebt,
    };
  }, [netWorth, transactions, totalAccountBalance, totalMoneyBoxBalance, totalOutstandingLoanReceivables, totalOutstandingCreditCardDebt]);


  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);
  
  const budgetedCategories = useMemo(() => {
    return categories.filter(c => c.type === TransactionType.EXPENSE && c.monthly_budget && c.monthly_budget > 0);
  }, [categories]);

  const budgetSummary = useMemo(() => {
    const totalBudgeted = budgetedCategories.reduce((sum, cat) => sum + (cat.monthly_budget || 0), 0);
    let totalSpentInBudgetedCategories = 0;

    budgetedCategories.forEach(cat => {
        const spending = transactions
            .filter(t => t.category_id === cat.id && t.date.startsWith(currentMonthYYYYMM) && t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);
        totalSpentInBudgetedCategories += spending;
    });
    return { totalBudgeted, totalSpentInBudgetedCategories };
  }, [budgetedCategories, transactions, currentMonthYYYYMM]);

  const handleRecalculateSafeToSpend = () => {
    onFetchSafeToSpendToday();
  };


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Painel Geral</h1>
          <p className="text-textMuted dark:text-textMutedDark">Bem-vindo ao seu controle financeiro.</p>
        </div>
        <div className="flex items-center gap-x-2 sm:gap-x-3">
            <Button onClick={onFetchGeneralAdvice} variant="ghost" size="md" className="!px-2 sm:!px-3" title="Obter Conselho Rápido da IA">
                <LightBulbIcon className="w-5 h-5 text-yellow-500 dark:text-yellow-400 sm:mr-2" />
                <span className="hidden sm:inline">Conselho</span>
            </Button>
            <Button onClick={onFetchSavingOpportunities} variant="ghost" size="md" className="!px-2 sm:!px-3" title="Buscar Oportunidades de Economia com IA">
                <SparklesIcon className="w-5 h-5 text-teal-500 dark:text-teal-400 sm:mr-2" />
                <span className="hidden sm:inline">Economizar</span>
            </Button>
            <Button onClick={onAddTransaction} variant="primary" size="lg">
            <PlusIcon className="w-5 h-5 mr-2" />
            Nova Transação
            </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Safe to Spend Today Card - Moved into the grid */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1">
              <div className="flex items-center space-x-1.5">
                  <TrendingUpIcon className="w-6 h-6 text-green-500 dark:text-green-400" />
                  <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">GASTAR HOJE (IA)</h2>
                  <InfoTooltip text="Sugestão de valor para gastos variáveis hoje, considerando seus saldos, despesas fixas futuras e orçamentos essenciais." />
              </div>
              <Button
                  onClick={handleRecalculateSafeToSpend}
                  variant="ghost"
                  size="sm"
                  disabled={safeToSpendToday.isLoading}
                  className="!text-xs !py-1 !px-2 self-start sm:self-center"
                  title="Recalcular sugestão da IA"
              >
                  <ArrowPathIcon className={`w-3 h-3 mr-1 ${safeToSpendToday.isLoading ? 'animate-spin' : ''}`} />
                  {safeToSpendToday.isLoading ? '...' : 'Recalcular'}
              </Button>
          </div>

          {safeToSpendToday.isLoading && !safeToSpendToday.safeAmount && !isPrivacyModeEnabled ? (
              <p className="text-center text-textMuted dark:text-textMutedDark py-3 text-xs">Calculando...</p>
          ) : safeToSpendToday.safeAmount !== null ? (
              <p className={`text-3xl font-bold text-center my-2 ${
                  safeToSpendToday.safeAmount === 0 && (safeToSpendToday.explanation || '').toLowerCase().includes('evite')
                  ? 'text-amber-500 dark:text-amber-400'
                  : safeToSpendToday.safeAmount > 0
                  ? 'text-green-600 dark:text-green-500'
                  : 'text-red-500 dark:text-red-400'
              }`}>
              {formatCurrency(safeToSpendToday.safeAmount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
              </p>
          ) : (
              <p className={`text-2xl font-bold text-center my-2 text-amber-500 dark:text-amber-400`}>
                  {isPrivacyModeEnabled ? formatCurrency(0, 'BRL','pt-BR', true) : "---"}
              </p>
          )}
          
          <p className="text-xs text-textMuted dark:text-textMutedDark text-center break-words min-h-[28px] leading-tight">
              {safeToSpendToday.isLoading && safeToSpendToday.safeAmount !== null ? 'Recalculando...' : (safeToSpendToday.explanation || "Clique em Recalcular.")}
          </p>
          {safeToSpendToday.lastCalculatedDisplay && (
              <p className="text-xs text-textMuted/70 dark:text-textMutedDark/70 text-center mt-1">
                  Calc.: {safeToSpendToday.lastCalculatedDisplay}
              </p>
          )}
          {safeToSpendToday.error && (
              <p className="text-xs text-destructive dark:text-destructiveDark text-center mt-1">
                  Erro: {safeToSpendToday.error.length > 50 ? safeToSpendToday.error.substring(0,50) + "..." : safeToSpendToday.error}
              </p>
          )}
          <p className="text-xs text-textMuted/60 dark:text-textMutedDark/60 text-center mt-1.5 italic leading-tight">
              Sugestão da IA. Use com discernimento.
          </p>
        </div>

        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30 flex flex-col">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">SALDO EM CONTAS</h2>
          <p className={`text-3xl font-bold ${totalAccountBalance >= 0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(totalAccountBalance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
           {!isPrivacyModeEnabled && (
                <div className="w-full h-16 mt-2 mb-1">
                    <ResponsiveContainer>
                        <LineChart data={balanceProjectionData} margin={{ top: 5, right: 5, bottom: 0, left: -35 }}>
                            <RechartsTooltip content={<MiniChartTooltip formatter={(v:number) => formatCurrency(v)} name="Saldo"/>} />
                            <Line type="monotone" dataKey="balance" stroke="#2563EB" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
            <h3 className="text-xs font-semibold text-textMuted dark:text-textMutedDark mt-2">PRÓXIMOS 7 DIAS</h3>
            <ul className="space-y-1 text-xs mt-1 overflow-y-auto max-h-[70px] flex-grow">
                {isPrivacyModeEnabled ? <li className="text-center">...</li> : upcomingTransactions.length > 0 ? (
                upcomingTransactions.map(rt => (
                    <li key={rt.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        {rt.type === TransactionType.INCOME ? <TrendingUpIcon className="w-3 h-3 text-green-500"/> : <TrendingDownIcon className="w-3 h-3 text-red-500"/>}
                        <span className="truncate" title={rt.description}>{rt.description}</span>
                    </div>
                    <span className={`font-semibold ${rt.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                        ({formatDate(rt.next_due_date, 'pt-BR', {day: '2-digit', month: '2-digit'})}) {formatCurrency(rt.amount)}
                    </span>
                    </li>
                ))
                ) : (
                <p className="text-xs text-textMuted/70 dark:text-textMutedDark/70">Nenhuma movimentação recorrente prevista.</p>
                )}
            </ul>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30 flex flex-col">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">SALDO CAIXINHAS</h2>
          <p className={`text-3xl font-bold ${totalMoneyBoxBalance >= 0 ? 'text-blue-500 dark:text-blue-400' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(totalMoneyBoxBalance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
            <ul className="space-y-3 text-xs mt-4 overflow-y-auto max-h-[140px] flex-grow pr-2">
            {isPrivacyModeEnabled ? <li className="text-center">...</li> : moneyBoxes.length > 0 ? (
                moneyBoxes.map(mb => {
                    const balance = calculateMoneyBoxBalance(mb.id);
                    const goal = mb.goal_amount || 0;
                    const progress = goal > 0 ? Math.min(100, (balance / goal) * 100) : 0;
                    
                    const progressBarWidth = 10;
                    const filledChars = Math.round((progress / 100) * progressBarWidth);
                    const emptyChars = progressBarWidth - filledChars;
                    const progressBar = '█'.repeat(filledChars) + '░'.repeat(emptyChars);

                    return (
                        <li key={mb.id} className="text-xs">
                            <p className="font-semibold text-textBase dark:text-textBaseDark truncate" title={mb.name}>{mb.name}</p>
                            {goal > 0 ? (
                                <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="font-mono text-primary dark:text-primaryDark" aria-label={`Progresso: ${progress.toFixed(0)}%`}>{progressBar}</span>
                                    <span className="text-textMuted dark:text-textMutedDark whitespace-nowrap">
                                        {formatCurrency(balance)} / {formatCurrency(goal)} ({progress.toFixed(1)}%)
                                    </span>
                                </div>
                            ) : (
                                <p className="text-textMuted dark:text-textMutedDark">{formatCurrency(balance)} (Sem meta)</p>
                            )}
                        </li>
                    );
                })
            ) : (
                <p className="text-xs text-textMuted/70 dark:text-textMutedDark/70 text-center py-4">Nenhuma caixinha criada.</p>
            )}
            </ul>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
            <div className="flex items-center justify-between w-full mb-1">
                <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">PATRIMÔNIO LÍQUIDO</h2>
                <ScaleIcon className="w-5 h-5 text-textMuted dark:text-textMutedDark" />
            </div>
            <div className="flex items-baseline space-x-2">
                <p className={`text-3xl font-bold ${netWorth >= 0 ? 'text-primary dark:text-primaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
                    {formatCurrency(netWorth, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
                </p>
                {!isPrivacyModeEnabled && (
                    <span className={`flex items-center text-sm font-bold ${netWorthCalculations.changePercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {netWorthCalculations.changePercentage >= 0 ? <TrendingUpIcon className="w-4 h-4"/> : <TrendingDownIcon className="w-4 h-4"/>}
                        {netWorthCalculations.changePercentage.toFixed(1)}%
                    </span>
                )}
            </div>
             <p className="text-xs text-textMuted/80 dark:text-textMutedDark/80">vs. início do mês</p>

             <div className="text-xs mt-3 space-y-2">
                <div>
                    <h4 className="font-semibold text-green-600 dark:text-green-500 flex items-center gap-1"><TrendingUpIcon className="w-3 h-3"/>Ativos: {formatCurrency(netWorthCalculations.totalAssets, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</h4>
                    {!isPrivacyModeEnabled && (
                        <ul className="list-disc list-inside pl-3 text-textMuted dark:text-textMutedDark text-xs">
                            <li>Contas: {formatCurrency(totalAccountBalance)}</li>
                            <li>Caixinhas: {formatCurrency(totalMoneyBoxBalance)}</li>
                            <li>A Receber: {formatCurrency(totalOutstandingLoanReceivables)}</li>
                        </ul>
                    )}
                </div>
                <div>
                    <h4 className="font-semibold text-red-600 dark:text-red-500 flex items-center gap-1"><TrendingDownIcon className="w-3 h-3"/>Passivos: {formatCurrency(netWorthCalculations.totalLiabilities, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</h4>
                     {!isPrivacyModeEnabled && (
                        <ul className="list-disc list-inside pl-3 text-textMuted dark:text-textMutedDark text-xs">
                            <li>Cartões: {formatCurrency(totalOutstandingCreditCardDebt)}</li>
                        </ul>
                    )}
                </div>
            </div>
            {netWorthCalculations.showLiquidityAlert && !isPrivacyModeEnabled && (
                <div className="mt-2 p-1.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-md text-center">
                    <span className="font-bold">Alerta:</span> Patrimônio pouco líquido, muito concentrado em valores a receber.
                </div>
            )}
        </div>
        
        {/* This takes the 4th slot on large screens, now we have more cards, this might break layout on some screens */}
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30 md:col-span-2 lg:col-span-4">
            <div className="flex items-center w-full justify-between">
                 <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">A RECEBER (EMPRÉSTIMOS) ({outstandingLoans.length})</h2>
                 <UsersIcon className="w-5 h-5 text-textMuted dark:text-textMutedDark" />
            </div>
          <p className={`text-3xl font-bold text-green-600 dark:text-green-500`}>
            {formatCurrency(totalOutstandingLoanReceivables, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
        </div>
      </div>

      <BillsAlerts 
        recurringTransactions={recurringTransactions} 
        accounts={accounts} 
        categories={categories}
        onViewTransaction={onViewRecurringTransaction} 
        isPrivacyModeEnabled={isPrivacyModeEnabled}
      />
      
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
                <div className="h-6 border-l border-borderBase dark:border-borderBaseDark mx-1 sm:mx-2"></div>
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
        {isPrivacyModeEnabled ? (
            <p className="text-center text-textMuted dark:text-textMutedDark py-8">Gráficos ocultos em Modo Privacidade.</p>
        ) : monthlyChartDisplayMode === 'pie' ? (
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
      
      {budgetedCategories.length > 0 && (
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Orçamento Mensal ({currentMonthYYYYMM.split('-')[1]}/{currentMonthYYYYMM.split('-')[0]})</h2>
          <div className="mb-3">
            <div className="flex justify-between text-sm">
              <span>Total Gasto (Orçado): {formatCurrency(budgetSummary.totalSpentInBudgetedCategories, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
              <span>Total Orçado: {formatCurrency(budgetSummary.totalBudgeted, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
            </div>
            {!isPrivacyModeEnabled && budgetSummary.totalBudgeted > 0 && (
                <div className="w-full progress-bar-bg rounded-full h-2.5 mt-1 dark:progress-bar-bg">
                <div 
                    className={`h-2.5 rounded-full ${budgetSummary.totalSpentInBudgetedCategories > budgetSummary.totalBudgeted ? 'bg-destructive' : 'bg-primary dark:bg-primaryDark'}`}
                    style={{ width: `${Math.min((budgetSummary.totalSpentInBudgetedCategories / budgetSummary.totalBudgeted) * 100, 100)}%` }}
                ></div>
                </div>
            )}
            {isPrivacyModeEnabled && <p className="text-xs text-textMuted dark:text-textMutedDark text-center">Progresso oculto em Modo Privacidade.</p>}
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {budgetedCategories.map(cat => {
                const spending = transactions
                    .filter(t => t.category_id === cat.id && t.date.startsWith(currentMonthYYYYMM) && t.type === TransactionType.EXPENSE)
                    .reduce((sum, t) => sum + t.amount, 0);
                const progress = cat.monthly_budget ? Math.min((spending / cat.monthly_budget) * 100, 100) : 0;
                const isOver = cat.monthly_budget ? spending > cat.monthly_budget : false;
                return (
                    <li key={cat.id} className="text-sm">
                        <div className="flex justify-between">
                            <span>{cat.name}</span>
                            <span className={isOver ? 'text-destructive dark:text-destructiveDark' : ''}>
                                {formatCurrency(spending, 'BRL', 'pt-BR', isPrivacyModeEnabled)} / {formatCurrency(cat.monthly_budget || 0, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
                            </span>
                        </div>
                        {!isPrivacyModeEnabled && cat.monthly_budget && cat.monthly_budget > 0 && (
                            <div className="w-full progress-bar-bg rounded-full h-1.5 mt-0.5 dark:progress-bar-bg">
                                <div className={`h-1.5 rounded-full ${isOver ? 'bg-destructive' : 'bg-secondary dark:bg-secondaryDark'}`} style={{ width: `${progress}%`}}></div>
                            </div>
                        )}
                    </li>
                );
            })}
          </ul>
        </div>
      )}


      <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Transações Recentes</h2>
        {recentTransactions.length > 0 ? (
          <ul className="space-y-3">
            {recentTransactions.map(tx => {
              const account = accounts.find(a => a.id === tx.account_id);
              const category = categories.find(c => c.id === tx.category_id);
              let txColor = 'text-textBase dark:text-textBaseDark';
              if (tx.type === TransactionType.INCOME) txColor = 'text-secondary dark:text-secondaryDark';
              else if (tx.type === TransactionType.EXPENSE) txColor = 'text-destructive dark:text-destructiveDark';
              
              let descriptionText = tx.description || (tx.type === TransactionType.TRANSFER ? 'Transferência' : category?.name) || 'Transação';
              if (tx.type === TransactionType.TRANSFER) {
                const toAccount = accounts.find(a => a.id === tx.to_account_id);
                descriptionText += ` para ${toAccount?.name || 'N/A'}`;
              }

              return (
                <li key={tx.id} className="flex justify-between items-center py-2 border-b border-borderBase/50 dark:border-borderBaseDark/50 last:border-b-0">
                  <div>
                    <p className="font-medium text-textBase dark:text-textBaseDark">{descriptionText}</p>
                    <p className="text-sm text-textMuted dark:text-textMutedDark">{account?.name} &bull; {formatDate(tx.date)}</p> 
                  </div>
                  <p className={`font-semibold ${txColor}`}>{formatCurrency(tx.amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
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