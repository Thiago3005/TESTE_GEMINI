
import React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { Transaction, Account, Category, TransactionType } from '../types';
import { formatCurrency, getISODateString, formatDate } from '../utils/helpers';
import Select from './Select';
import Input from './Input';
// import Button from './Button'; // Not used in this version
import PresentationChartLineIcon from './icons/PresentationChartLineIcon';
import { LineChart, BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, Pie, Cell } from 'recharts';

interface CashFlowViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  isPrivacyModeEnabled?: boolean;
}

// Helper to calculate account balance up to a specific date
const calculateBalanceAsOfDate = (
  targetDate: string, // YYYY-MM-DD
  initialAccounts: Account[],
  allTransactions: Transaction[]
): number => {
  let totalBalance = initialAccounts.reduce((sum, acc) => sum + acc.initial_balance, 0);

  for (const transaction of allTransactions) {
    if (transaction.date > targetDate) continue;

    const isAccountRelevant = initialAccounts.some(acc => acc.id === transaction.account_id || acc.id === transaction.to_account_id);
    if (!isAccountRelevant && transaction.type !== TransactionType.TRANSFER) continue; // For non-transfers, only relevant accounts count

    if (initialAccounts.some(acc => acc.id === transaction.account_id)) { // Source account is one of the initialAccounts
        if (transaction.type === TransactionType.INCOME) {
            totalBalance += transaction.amount;
        } else if (transaction.type === TransactionType.EXPENSE) {
            totalBalance -= transaction.amount;
        } else if (transaction.type === TransactionType.TRANSFER) {
            // If it's a transfer FROM one of the initialAccounts TO an external account (or not specified as one of initialAccounts), it's an outflow
            if (!transaction.to_account_id || !initialAccounts.some(acc => acc.id === transaction.to_account_id)) {
                 totalBalance -= transaction.amount;
            }
            // If transfer is between two initialAccounts, it's neutral for totalBalance of initialAccounts (handled by to_account_id check below)
        }
    }
    
    // Handle transfers TO one of the initialAccounts from an external account (or not specified as one of initialAccounts)
    if (transaction.to_account_id && initialAccounts.some(acc => acc.id === transaction.to_account_id)) {
        if (transaction.type === TransactionType.TRANSFER) {
            // If the source account is NOT one of the initialAccounts, it's an inflow
            if (!initialAccounts.some(acc => acc.id === transaction.account_id)) {
                totalBalance += transaction.amount;
            }
        }
    }
  }
  return totalBalance;
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
    // Recharts' payload for Pie often has percent directly, but if not, calculate
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
}) => {
  const today = new Date();
  const currentMonthStart = getISODateString(new Date(today.getFullYear(), today.getMonth(), 1));
  const currentMonthEnd = getISODateString(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [filterPeriod, setFilterPeriod] = useState<'current_month' | 'last_3_months' | 'current_year' | 'last_year' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState(currentMonthStart);
  const [customEndDate, setCustomEndDate] = useState(currentMonthEnd);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let startDt = new Date(now.getFullYear(), now.getMonth(), 1);
    let endDt = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (filterPeriod) {
      case 'last_3_months':
        endDt = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
        startDt = new Date(now.getFullYear(), now.getMonth() -2, 1); // Start of 2 months ago
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
    const daysInRange: string[] = [];
    let current = new Date(startDate + 'T00:00:00'); // Ensure local timezone start
    const end = new Date(endDate + 'T00:00:00');
    while (current <= end) {
        daysInRange.push(getISODateString(current));
        current.setDate(current.getDate() + 1);
    }

    return daysInRange.map(day => ({
        date: formatDate(day, 'pt-BR', { day: '2-digit', month: 'short' }), // Label for X-axis
        fullDate: day, // For sorting/reference
        balance: calculateBalanceAsOfDate(day, accounts, transactions),
    }));
  }, [startDate, endDate, accounts, transactions]);

  // Data for Income vs. Expense Bar Chart
  const incomeExpenseBarData = useMemo(() => {
    const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
    const groupByMonth = diffDays > 45;

    const grouped: { [key: string]: { income: number; expense: number; label: string, sortKey: string } } = {};

    periodTransactions.forEach(t => {
      const periodKey = groupByMonth ? t.date.substring(0, 7) : t.date; // YYYY-MM or YYYY-MM-DD
      const label = groupByMonth 
        ? formatDate(periodKey + '-01T00:00:00', 'pt-BR', { month: 'short', year: '2-digit' }) // Display 'Jan/24'
        : formatDate(periodKey + 'T00:00:00', 'pt-BR', { day: '2-digit', month: 'short' }); // Display '01/Jan'

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
    
    const MAX_SLICES = 6; // Max slices to show individually
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
                        if (percent * 100 < 3) return null; // Hide label for very small slices
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
