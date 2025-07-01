import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Transaction, TransactionType, ChartData } from '../types';
import { formatCurrency, getISODateString } from '../utils/helpers';

interface DailySummaryLineChartProps {
  transactions: Transaction[];
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  month: string; // YYYY-MM
  isPrivacyModeEnabled?: boolean;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    const colorClass = payload[0].stroke === '#00C49F' ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark';
    const descriptions = payload[0].payload.descriptions || [];
    return (
      <div className="bg-surface dark:bg-surfaceDark p-3 border border-borderBase dark:border-borderBaseDark rounded shadow-lg backdrop-blur-sm">
        <p className="text-sm font-semibold text-textBase dark:text-textBaseDark">Dia {label}</p>
        <p className={`text-sm font-medium ${colorClass}`}>
          {payload[0].name}: {formatCurrency(payload[0].value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
        </p>
        {descriptions.length > 0 && (
          <div className="mt-2 pt-1 border-t border-borderBase/50 dark:border-borderBaseDark/50 max-w-xs">
            <ul className="text-xs text-textMuted dark:text-textMutedDark list-disc list-inside space-y-0.5">
              {descriptions.slice(0, 5).map((desc: string, index: number) => (
                <li key={index} className="truncate">{desc}</li>
              ))}
              {descriptions.length > 5 && <li>... e mais {descriptions.length - 5}</li>}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const DailySummaryLineChart: React.FC<DailySummaryLineChartProps> = ({ transactions, type, month, isPrivacyModeEnabled }) => {
  const data: ChartData[] = React.useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    const dailyData: ChartData[] = Array.from({ length: daysInMonth }, (_, i) => ({
      name: (i + 1).toString().padStart(2, '0'), // Day as "01", "02", ...
      value: 0,
      descriptions: [],
    }));

    transactions.forEach(t => {
      if (t.type === type && t.date.startsWith(month)) {
        const dayOfMonth = parseInt(t.date.split('-')[2], 10) - 1; // 0-indexed
        if (dayOfMonth >= 0 && dayOfMonth < daysInMonth && dailyData[dayOfMonth]) {
          dailyData[dayOfMonth].value += t.amount;
          if (dailyData[dayOfMonth].descriptions) {
            dailyData[dayOfMonth].descriptions!.push(t.description || (type === TransactionType.INCOME ? "Receita" : "Despesa"));
          }
        }
      }
    });
    return dailyData;
  }, [transactions, type, month]);

  const hasData = data.some(d => d.value > 0);
  const isCurrentMonth = month === getISODateString(new Date()).substring(0, 7);
  const dataPointsCount = data.filter(d => d.value > 0).length;

  if (!hasData) {
    return <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhum dado para exibir no gráfico para {type === TransactionType.INCOME ? 'receitas' : 'despesas'} este mês.</p>;
  }
  
  const yAxisTickFormatter = (value: number) => {
    if (isPrivacyModeEnabled) return '****';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };
  
  const lineColor = type === TransactionType.INCOME ? '#00C49F' : '#FF8042';

  return (
    <div className="w-full h-80 md:h-96">
      {isCurrentMonth && dataPointsCount > 0 && dataPointsCount < 3 && (
         <p className="text-center text-xs text-amber-600 dark:text-amber-500 mb-2">
           Ainda há poucos dados para este mês. O gráfico ficará mais completo ao longo dos dias.
         </p>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5, right: 20, left: -10, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="stroke-neutral dark:stroke-neutralDark" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: 'currentColor' }} 
            className="text-textMuted dark:text-textMutedDark"
            interval="preserveStartEnd"
          />
          <YAxis 
            tickFormatter={yAxisTickFormatter} 
            tick={{ fontSize: 10, fill: 'currentColor' }} 
            className="text-textMuted dark:text-textMutedDark"
            width={isPrivacyModeEnabled ? 45 : 60}
            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15 / 10) * 10]}
           />
          <Tooltip content={<CustomTooltip isPrivacyModeEnabled={isPrivacyModeEnabled} />} cursor={{ stroke: 'gray', strokeWidth: 1, strokeDasharray: '3 3' }}/>
          <Legend 
            formatter={(value) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} 
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            name={type === TransactionType.INCOME ? "Receitas" : "Despesas"} 
            stroke={lineColor} 
            strokeWidth={2} 
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailySummaryLineChart;