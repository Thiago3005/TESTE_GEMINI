

import React from 'react';
import { useState, useMemo, useCallback, ChangeEvent } from 'react';
import { Transaction, Account, Category, TransactionType, SimulatedTransactionForProjection } from '../types';
import { TRANSACTION_TYPE_OPTIONS } from '../constants'; // For simulation form
import { formatCurrency, getISODateString, formatDate } from '../utils/helpers';
import Select from './Select';
import Input from './Input';
import Button from './Button'; // Added Button for AI action
import PresentationChartLineIcon from './icons/PresentationChartLineIcon';
import CalendarClockIcon from './icons/CalendarClockIcon'; // For AI button
import { LineChart, BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, Pie, Cell } from 'recharts';

interface CashFlowViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[]; // Keep for potential future use, though not directly used by charts now
  isPrivacyModeEnabled?: boolean;
  onFetchCashFlowProjection: (projectionPeriodDays?: number, simulatedTransaction?: SimulatedTransactionForProjection) => void; // New prop
}

// Helper to calculate account balance up to a specific date
const calculateBalanceAsOfDate = (
  targetDate: string,
  allAccounts: Account[],
  allTransactions: Transaction[]
): number => {
  const totalInitialBalance = allAccounts.reduce((sum, acc) => sum + acc.initial_balance, 0);

  const relevantTransactions = allTransactions.filter(t => t.date <= targetDate);

  const netFlow = relevantTransactions.reduce((flow, transaction) => {
    // Check if the transaction's primary account (account_id) is a cash account
    const isPrimaryAccountCash = allAccounts.some(acc => acc.id === transaction.account_id);
    // Check if the transfer destination account (to_account_id) is a cash account
    const isDestinationAccountCash = transaction.to_account_id 
      ? allAccounts.some(acc => acc.id === transaction.to_account_id) 
      : false;

    switch (transaction.type) {
      case TransactionType.INCOME:
        // Income increases cash flow if it goes into a cash account.
        if (isPrimaryAccountCash) {
          return flow + transaction.amount;
        }
        break;
      case TransactionType.EXPENSE:
        // Expense decreases cash flow if it comes from a cash account.
        // (Credit card expenses are ignored because their account_id is not in allAccounts).
        if (isPrimaryAccountCash) {
          return flow - transaction.amount;
        }
        break;
      case TransactionType.TRANSFER:
        // Transfers between two cash accounts are net-zero, so they are ignored.
        // Only transfers between a cash account and an external source affect cash flow.
        if (isPrimaryAccountCash && !isDestinationAccountCash) {
          // Cash account -> External
          return flow - transaction.amount;
        }
        if (!isPrimaryAccountCash && isDestinationAccountCash) {
          // External -> Cash account (this case is less common for 'TRANSFER' type)
          return flow + transaction.amount;
        }
        break;
    }
    
    // Return flow unchanged for transactions that don't affect total cash balance
    return flow;
  }, 0);

  return totalInitialBalance + netFlow;
};


// Custom Tooltip for Line Chart
const CustomLineTooltipContent: React.FC<any> = ({ active, payload, label, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface dark:bg-surfaceDark p-3 border border-borderBase dark:border-borderBaseDark rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-textBase dark:text-textBaseDark">{`Data: ${label}`}</p>
        <p className="text-sm text-blue-500 dark:text-blue-400">{`Saldo: ${formatCurrency(payload[0].value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}`}</p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Bar Chart
const CustomBarTooltipContent: React.FC<any> = ({ active, payload, label, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface dark:bg-surfaceDark p-3 border border-borderBase dark:border-borderBaseDark rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-textBase dark:text-textBaseDark">{`Período: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
            {`${entry.name}: ${formatCurrency(entry.value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Pie Chart
const CustomPieTooltipContent: React.FC<any> = ({ active, payload, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    const name = payload[0].name;
    const value = payload[0].value;
    const percent = payload[0].payload.percent || (payload[0].payload.value / payload.reduce((s:number, p:any) => s + p.payload.value, 0));

    return (
      <div className="bg-surface dark:bg-surfaceDark p-3 border border-borderBase dark:border-borderBaseDark rounded-lg shadow-lg">
        <p className="text-sm font-semibold" style={{ color: payload[0].payload.fill }}>
          {`${name}: ${formatCurrency(value, 'BRL', 'pt-BR', isPrivacyModeEnabled)} (${(percent * 100).toFixed(1)}%)`}
        </p>
      </div>
    );
  }
  return null;
};


const CashFlowView: React.FC<CashFlowViewProps> = ({
  transactions,
  accounts,
  categories,
  isPrivacyModeEnabled,
  onFetchCashFlowProjection, // Destructure new prop
}) => {
  const today = new Date();
  const currentMonthStart = getISODateString(new Date(today.getFullYear(), today.getMonth(), 1));
  const currentMonthEnd = getISODateString(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [filterPeriod, setFilterPeriod] = useState<'current_month' | 'last_3_months' | 'current_year' | 'last_year' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState(currentMonthStart);
  const [customEndDate, setCustomEndDate] = useState(currentMonthEnd);

  // State for simulation form (moved from AICoachView)
  const [simulatedDescription, setSimulatedDescription] = useState('');
  const [simulatedAmount, setSimulatedAmount] = useState('');
  const [simulatedType, setSimulatedType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [simulatedDate, setSimulatedDate] = useState(getISODateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))); // Default to 1 week from now
  const [showSimulationForm, setShowSimulationForm] = useState(false);


  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let startDt = new Date(now.getFullYear(), now.getMonth(), 1);
    let endDt = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (filterPeriod) {
      case 'last_3_months':
        endDt = new Date(now.getFullYear(), now.getMonth() + 1, 0); 
        startDt = new Date(now.getFullYear(), now.getMonth() -2, 1); 
        break;
      case 'current_year':
        startDt = new Date(now.getFullYear(), 0, 1);
        endDt = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        startDt = new Date(now.getFullYear() - 1, 0, 1);
        endDt = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        return { startDate: customStartDate, endDate: customEndDate };
      case 'current_month':
      default:
        break;
    }
    return { startDate: getISODateString(startDt), endDate: getISODateString(endDt) };
  }, [filterPeriod, customStartDate, customEndDate]);

  const periodTransactions = useMemo(() => {
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }, [transactions, startDate, endDate]);
  
  const kpis = useMemo(() => {
      const dayBeforeStartDateObj = new Date(startDate + 'T00:00:00');
      dayBeforeStartDateObj.setDate(dayBeforeStartDateObj.getDate() -1);
      const dayBeforeStartDate = getISODateString(dayBeforeStartDateObj);
      const initialBalance = calculateBalanceAsOfDate(dayBeforeStartDate, accounts, transactions);
      
      let totalIncome = 0;
      let totalExpenses = 0;
      periodTransactions.forEach(t => {
        if (t.type === TransactionType.INCOME) totalIncome += t.amount;
        else if (t.type === TransactionType.EXPENSE) totalExpenses += t.amount;
      });
      const netCashFlow = totalIncome - totalExpenses;
      const finalBalance = initialBalance + netCashFlow;
      return { initialBalance, totalIncome, totalExpenses, netCashFlow, finalBalance };
  }, [startDate, periodTransactions, accounts, transactions]);

  // Data for Cumulative Balance Line Chart
  const cumulativeBalanceData = useMemo(() => {
    if (!accounts.length) return [];

    // 1. Calculate the starting balance for the period.
    const dayBeforeStartDate = new Date(startDate + 'T00:00:00');
    dayBeforeStartDate.setDate(dayBeforeStartDate.getDate() - 1);
    const initialDateStr = getISODateString(dayBeforeStartDate);
    let currentBalance = calculateBalanceAsOfDate(initialDateStr, accounts, transactions);

    const dataPoints = [{
        date: formatDate(initialDateStr, 'pt-BR', { day: '2-digit', month: 'short' }),
        fullDate: initialDateStr,
        balance: currentBalance,
        key: `${initialDateStr}-start` // Unique key for the chart component
    }];

    // 2. Get and sort all cash-affecting transactions within the period.
    const periodCashTransactions = transactions
        .filter(t => {
            const isPrimaryAccountCash = accounts.some(acc => acc.id === t.account_id);
            if (t.type === TransactionType.INCOME && isPrimaryAccountCash) return true;
            if (t.type === TransactionType.EXPENSE && isPrimaryAccountCash) return true;
            if (t.type === TransactionType.TRANSFER) {
                const isDestinationAccountCash = t.to_account_id ? accounts.some(acc => acc.id === t.to_account_id) : false;
                return (isPrimaryAccountCash && !isDestinationAccountCash) || (!isPrimaryAccountCash && isDestinationAccountCash);
            }
            return false;
        })
        .filter(t => t.date >= startDate && t.date <= endDate)
        .sort((a, b) => {
            const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateComparison !== 0) return dateComparison;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

    // 3. Create a data point for each transaction
    periodCashTransactions.forEach((tx) => {
        let balanceChange = 0;
        switch (tx.type) {
            case TransactionType.INCOME:
                balanceChange = tx.amount;
                break;
            case TransactionType.EXPENSE:
                balanceChange = -tx.amount;
                break;
            case TransactionType.TRANSFER:
                if (accounts.some(acc => acc.id === tx.account_id)) {
                    balanceChange = -tx.amount; // Out of cash
                } else {
                    balanceChange = tx.amount; // Into cash
                }
                break;
        }
        
        currentBalance += balanceChange;
        
        dataPoints.push({
            date: formatDate(tx.date, 'pt-BR', { day: '2-digit', month: 'short' }),
            fullDate: tx.date,
            balance: currentBalance,
            key: tx.id // A unique key is important
        });
    });
    
    // To ensure the line chart extends to the end of the period even if the last transaction is not on the last day.
    const lastDataPointDate = dataPoints.length > 1 ? dataPoints[dataPoints.length - 1].fullDate : initialDateStr;
    if (lastDataPointDate < endDate) {
        dataPoints.push({
            date: formatDate(endDate, 'pt-BR', { day: '2-digit', month: 'short' }),
            fullDate: endDate,
            balance: currentBalance,
            key: `${endDate}-end`
        });
    }

    return dataPoints;
  }, [startDate, endDate, accounts, transactions]);

  // Data for Income vs. Expense Bar Chart
  const incomeExpenseBarData = useMemo(() => {
    const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    const groupByMonth = diffDays > 45;

    const grouped: { [key: string]: { income: number; expense: number; label: string, sortKey: string } } = {};

    periodTransactions.forEach(t => {
      const periodKey = groupByMonth ? t.date.substring(0, 7) : t.date; 
      const label = groupByMonth 
        ? formatDate(periodKey + '-01T00:00:00', 'pt-BR', { month: 'short', year: '2-digit' }) 
        : formatDate(periodKey + 'T00:00:00', 'pt-BR', { day: '2-digit', month: 'short' }); 

      if (!grouped[periodKey]) {
        grouped[periodKey] = { income: 0, expense: 0, label: label, sortKey: periodKey };
      }
      if (t.type === TransactionType.INCOME) grouped[periodKey].income += t.amount;
      else if (t.type === TransactionType.EXPENSE) grouped[periodKey].expense += t.amount;
    });

    return Object.values(grouped).sort((a,b) => a.sortKey.localeCompare(b.sortKey));
  }, [periodTransactions, startDate, endDate]);

  // Data for Top Expense Categories Pie Chart
  const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A78BFA', '#F472B6', '#A3A3A3'];
  const expenseByCategoryPieData = useMemo(() => {
    const expenses = periodTransactions.filter(t => t.type === TransactionType.EXPENSE && t.category_id);
    const grouped: { [key: string]: { name: string; value: number } } = {};

    expenses.forEach(t => {
      const category = categories.find(c => c.id === t.category_id);
      const catName = category ? category.name : 'Outras Despesas';
      if (!grouped[catName]) {
        grouped[catName] = { name: catName, value: 0 };
      }
      grouped[catName].value += t.amount;
    });
    
    let sortedData = Object.values(grouped).sort((a, b) => b.value - a.value);
    
    const MAX_SLICES = 6; 
    if (sortedData.length > MAX_SLICES) { 
        const topItems = sortedData.slice(0, MAX_SLICES -1);
        const othersValue = sortedData.slice(MAX_SLICES -1).reduce((sum, item) => sum + item.value, 0);
        if (othersValue > 0) {
            return [...topItems, { name: 'Outras', value: othersValue }];
        }
        return topItems;
    }
    return sortedData;

  }, [periodTransactions, categories]);

  const periodOptions = [
    { value: 'current_month', label: 'Este Mês' },
    { value: 'last_3_months', label: 'Últimos 3 Meses' },
    { value: 'current_year', label: 'Este Ano' },
    { value: 'last_year', label: 'Ano Passado' },
    { value: 'custom', label: 'Personalizado' },
  ];
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterPeriod(e.target.value as typeof filterPeriod);
  };

  const handleGenerateCashFlowProjectionClick = () => {
    let simTx: SimulatedTransactionForProjection | undefined = undefined;
    if (showSimulationForm && simulatedAmount && parseFloat(simulatedAmount) > 0 && simulatedDate) {
        simTx = {
            description: simulatedDescription.trim() || (simulatedType === TransactionType.EXPENSE ? "Despesa Simulada" : "Receita Simulada"),
            amount: parseFloat(simulatedAmount),
            type: simulatedType,
            date: simulatedDate,
        };
    }
    onFetchCashFlowProjection(30, simTx);
  };


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <PresentationChartLineIcon className="w-8 h-8 text-primary dark:text-primaryDark" />
          <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Fluxo de Caixa</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-surface dark:bg-surfaceDark rounded-lg shadow dark:shadow-neutralDark/30">
        <Select
          label="Período"
          options={periodOptions}
          value={filterPeriod}
          onChange={handleFilterChange}
        />
        {filterPeriod === 'custom' && (
          <>
            <Input
              label="Data Inicial"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              max={customEndDate}
            />
            <Input
              label="Data Final"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={customStartDate}
            />
          </>
        )}
      </div>

      {/* AI Cash Flow Projection Section */}
      <div className="bg-surface dark:bg-surfaceDark p-4 sm:p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Previsão de Fluxo de Caixa com IA</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowSimulationForm(!showSimulationForm)}
          className="mb-3 text-sm text-primary dark:text-primaryDark hover:underline"
        >
          {showSimulationForm ? 'Esconder Simulação Opcional' : 'Adicionar Simulação à Previsão (Opcional)'}
        </Button>

        {showSimulationForm && (
          <div className="space-y-3 p-3 mb-4 border border-dashed border-neutral/50 dark:border-neutralDark/50 rounded-md bg-background dark:bg-backgroundDark/30">
            <h4 className="text-sm font-medium text-textMuted dark:text-textMutedDark">Simular Transação Futura</h4>
            <Input label="Descrição (Opcional)" value={simulatedDescription} onChange={e => setSimulatedDescription(e.target.value)} placeholder="Ex: Bônus Inesperado, Compra de Presente" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Valor Simulado" type="number" value={simulatedAmount} onChange={e => setSimulatedAmount(e.target.value)} placeholder="Ex: 500" />
              <Select label="Tipo" options={TRANSACTION_TYPE_OPTIONS.filter(opt => opt.value !== TransactionType.TRANSFER)} value={simulatedType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSimulatedType(e.target.value as TransactionType)} />
              <Input label="Data Simulado" type="date" value={simulatedDate} onChange={e => setSimulatedDate(e.target.value)} />
            </div>
          </div>
        )}
        <Button onClick={handleGenerateCashFlowProjectionClick} variant="secondary" size="md" className="w-full sm:w-auto">
            <CalendarClockIcon className="w-5 h-5 mr-1.5" />
            Gerar Previsão de Caixa (30 dias) {showSimulationForm && simulatedAmount ? 'com Simulação' : ''}
        </Button>
        <p className="text-xs text-textMuted dark:text-textMutedDark mt-2">
            Os resultados da previsão da IA aparecerão como um novo insight na aba "AI Coach".
        </p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">SALDO INICIAL</h3>
          <p className="text-2xl font-bold text-textBase dark:text-textBaseDark">{formatCurrency(kpis.initialBalance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">TOTAL ENTRADAS</h3>
          <p className="text-2xl font-bold text-secondary dark:text-secondaryDark">{formatCurrency(kpis.totalIncome, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">TOTAL SAÍDAS</h3>
          <p className="text-2xl font-bold text-destructive dark:text-destructiveDark">{formatCurrency(kpis.totalExpenses, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">FLUXO LÍQUIDO</h3>
          <p className={`text-2xl font-bold ${kpis.netCashFlow >= 0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(kpis.netCashFlow, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">SALDO FINAL</h3>
          <p className={`text-2xl font-bold ${kpis.finalBalance >= 0 ? 'text-textBase dark:text-textBaseDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(kpis.finalBalance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
        </div>
      </div>

      {/* Cumulative Balance Line Chart */}
      <div className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Fluxo de Caixa Acumulado</h2>
        {isPrivacyModeEnabled ? (
          <p className="text-center text-textMuted dark:text-textMutedDark py-8">Gráfico oculto em Modo Privacidade.</p>
        ) : cumulativeBalanceData.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={cumulativeBalanceData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} className="stroke-neutral/50 dark:stroke-neutralDark/50" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-textMuted dark:text-textMutedDark" />
                <YAxis tickFormatter={(value) => formatCurrency(value, 'BRL', 'pt-BR', isPrivacyModeEnabled)} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-textMuted dark:text-textMutedDark" width={isPrivacyModeEnabled ? 60 : 80} />
                <Tooltip content={<CustomLineTooltipContent isPrivacyModeEnabled={isPrivacyModeEnabled} />} />
                <Legend formatter={(value) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} />
                <Line type="monotone" dataKey="balance" name="Saldo Acumulado" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhum dado para exibir o fluxo acumulado.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs. Expense Bar Chart */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Receitas vs. Despesas por Período</h2>
          {isPrivacyModeEnabled ? (
            <p className="text-center text-textMuted dark:text-textMutedDark py-8">Gráfico oculto em Modo Privacidade.</p>
          ) : incomeExpenseBarData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={incomeExpenseBarData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} className="stroke-neutral/50 dark:stroke-neutralDark/50" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-textMuted dark:text-textMutedDark" />
                  <YAxis tickFormatter={(value) => formatCurrency(value, 'BRL', 'pt-BR', isPrivacyModeEnabled)} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-textMuted dark:text-textMutedDark" width={isPrivacyModeEnabled ? 60 : 80} />
                  <Tooltip content={<CustomBarTooltipContent isPrivacyModeEnabled={isPrivacyModeEnabled} />} />
                  <Legend formatter={(value) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} />
                  <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhum dado de receita/despesa para o período.</p>
          )}
        </div>

        {/* Top Expense Categories Pie Chart */}
        <div className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-4">Principais Categorias de Despesa</h2>
          {isPrivacyModeEnabled ? (
            <p className="text-center text-textMuted dark:text-textMutedDark py-8">Gráfico oculto em Modo Privacidade.</p>
          ) : expenseByCategoryPieData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={expenseByCategoryPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius="80%"
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        if (percent * 100 < 3) return null; 
                        return (
                            <text x={x} y={y} fill={document.documentElement.classList.contains('dark') ? '#E2E8F0' : '#1E293B'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11px" fontWeight="medium">
                                {`${name} (${(percent * 100).toFixed(0)}%)`}
                            </text>
                        );
                    }}
                  >
                    {expenseByCategoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltipContent isPrivacyModeEnabled={isPrivacyModeEnabled} />} />
                  <Legend formatter={(value) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma despesa categorizada no período.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashFlowView;