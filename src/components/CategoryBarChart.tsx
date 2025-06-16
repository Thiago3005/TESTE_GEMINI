
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Transaction, TransactionType, ChartData } from '../types';
import { formatCurrency } from '../utils/helpers';

interface DailySummaryBarChartProps {
  transactions: Transaction[];
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  month: string; // YYYY-MM
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface dark:bg-surfaceDark p-2 border border-borderBase dark:border-borderBaseDark rounded shadow-lg">
        <p className="text-sm font-semibold text-textBase dark:text-textBaseDark">Dia {label}</p>
        <p className={`text-sm ${payload[0].fill === '#00C49F' ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
          {payload[0].name}: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const DailySummaryBarChart: React.FC<DailySummaryBarChartProps> = ({ transactions, type, month }) => {
  const data: ChartData[] = React.useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    const dailyData: ChartData[] = Array.from({ length: daysInMonth }, (_, i) => ({
      name: (i + 1).toString().padStart(2, '0'), // Day as "01", "02", ...
      value: 0,
    }));

    transactions.forEach(t => {
      if (t.type === type && t.date.startsWith(month)) {
        const dayOfMonth = parseInt(t.date.split('-')[2], 10) -1; // 0-indexed
        if (dayOfMonth >= 0 && dayOfMonth < daysInMonth) {
          dailyData[dayOfMonth].value += t.amount;
        }
      }
    });
    return dailyData;
  }, [transactions, type, month]);

  if (data.every(d => d.value === 0)) {
    return <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhum dado para exibir no gráfico para {type === TransactionType.INCOME ? 'receitas' : 'despesas'} este mês.</p>;
  }
  
  const yAxisTickFormatter = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const barColor = type === TransactionType.INCOME ? '#00C49F' : '#FF8042'; // Green for income, Red/Orange for expense

  return (
    <div className="w-full h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5, right: 0, left: -10, bottom: 5, // Adjusted left margin for YAxis
          }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="stroke-neutral dark:stroke-neutralDark" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: 'currentColor' }} 
            className="text-textMuted dark:text-textMutedDark"
            interval="preserveStartEnd" // Show first and last, and some in between
            // angle={-30}
            // textAnchor={"end"}
            // height={40}
          />
          <YAxis 
            tickFormatter={yAxisTickFormatter} 
            tick={{ fontSize: 10, fill: 'currentColor' }} 
            className="text-textMuted dark:text-textMutedDark"
            width={45} // Increased width for YAxis labels
           />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}/>
          <Legend 
            payload={[{ value: type === TransactionType.INCOME ? 'Receitas' : 'Despesas', type: 'square', color: barColor }]}
            formatter={(value) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} 
          />
          <Bar dataKey="value" name={type === TransactionType.INCOME ? "Receitas" : "Despesas"} fill={barColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailySummaryBarChart;