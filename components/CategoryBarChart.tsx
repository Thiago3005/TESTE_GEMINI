

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { Transaction, TransactionType, ChartData } from '../types';
import { formatCurrency, getISODateString } from '../utils/helpers';

interface DailySummaryBarChartProps {
  transactions: Transaction[];
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  month: string; // YYYY-MM
  isPrivacyModeEnabled?: boolean;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    const descriptions = payload[0].payload.descriptions || [];
    return (
      <div className="bg-surface dark:bg-surfaceDark p-3 border border-borderBase dark:border-borderBaseDark rounded shadow-lg max-w-xs backdrop-blur-sm">
        <p className="text-sm font-semibold text-textBase dark:text-textBaseDark">Dia {label}</p>
        <p className={`text-sm font-medium ${payload[0].fill === '#00C49F' ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
          {payload[0].name}: {formatCurrency(payload[0].value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
        </p>
        {descriptions.length > 0 && (
          <div className="mt-2 pt-1 border-t border-borderBase/50 dark:border-borderBaseDark/50">
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

const DailySummaryBarChart: React.FC<DailySummaryBarChartProps> = ({ transactions, type, month, isPrivacyModeEnabled }) => {
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
        const dayOfMonth = parseInt(t.date.split('-')[2], 10) -1; // 0-indexed
        if (dayOfMonth >= 0 && dayOfMonth < daysInMonth && dailyData[dayOfMonth]) {
          dailyData[dayOfMonth].value += t.amount;
          if(dailyData[dayOfMonth].descriptions) {
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
  
  // Make the Y-axis domain more proportional
  const yAxisDomain = [0, (dataMax: number) => Math.ceil(dataMax * 1.15 / 10) * 10];
  
  const barColor = type === TransactionType.INCOME ? '#00C49F' : '#FF8042';

  // Custom label component to show on top of bars, hidden for small bars
  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (height < 20 || isPrivacyModeEnabled) { // Don't render if bar is too small or privacy on
      return null;
    }
    const formattedValue = formatCurrency(value, 'BRL', 'pt-BR', false).replace(/\s/g, ''); // Compact
    return (
      <text x={x + width / 2} y={y} dy={-5} fill="currentColor" className="text-textMuted dark:text-textMutedDark" fontSize="11" textAnchor="middle">
        {formattedValue}
      </text>
    );
  };

  return (
    <div className="w-full h-80 md:h-96">
      {isCurrentMonth && dataPointsCount > 0 && dataPointsCount < 3 && (
         <p className="text-center text-xs text-amber-600 dark:text-amber-500 mb-2">
           Ainda há poucos dados para este mês. O gráfico ficará mais completo ao longo dos dias.
         </p>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 25, right: 0, left: -10, bottom: 5, // Increased top margin for labels
          }}
        >
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.1"/>
            </filter>
          </defs>
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
            width={45}
            domain={yAxisDomain}
           />
          <Tooltip content={<CustomTooltip isPrivacyModeEnabled={isPrivacyModeEnabled} />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}/>
          <Legend 
            formatter={(value) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} 
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Bar dataKey="value" name={type === TransactionType.INCOME ? "Receitas" : "Despesas"} fill={barColor} radius={[4, 4, 0, 0]} filter="url(#shadow)">
             <LabelList dataKey="value" content={renderCustomizedLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailySummaryBarChart;