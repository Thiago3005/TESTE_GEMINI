import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Transaction, TransactionType, ChartData } from '../types';
import { formatCurrency, getISODateString } from '../utils/helpers';

interface DailySummaryLineChartProps {
  transactions: Transaction[];
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  month: string; // YYYY-MM
  isPrivacyModeEnabled?: boolean;
  overlayType?: TransactionType.INCOME | TransactionType.EXPENSE;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface dark:bg-surfaceDark p-3 border border-borderBase dark:border-borderBaseDark rounded shadow-lg backdrop-blur-sm">
        <p className="text-sm font-semibold text-textBase dark:text-textBaseDark">Dia {label}</p>
        {payload.map((p: any, index: number) => (
          p.value > 0 && (
            <div key={index} className="mt-1">
              <p className="text-sm font-medium" style={{ color: p.stroke }}>
                {p.name}: {formatCurrency(p.value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
              </p>
            </div>
          )
        ))}
      </div>
    );
  }
  return null;
};

const DailySummaryLineChart: React.FC<DailySummaryLineChartProps> = ({ transactions, type, month, isPrivacyModeEnabled, overlayType }) => {
  const data = React.useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    const dailyData: (ChartData & { value2?: number })[] = Array.from({ length: daysInMonth }, (_, i) => ({
      name: (i + 1).toString().padStart(2, '0'),
      value: 0,
      value2: 0,
    }));

    transactions.forEach(t => {
      if (t.date.startsWith(month)) {
        const dayOfMonth = parseInt(t.date.split('-')[2], 10) - 1;
        if (dayOfMonth >= 0 && dayOfMonth < daysInMonth && dailyData[dayOfMonth]) {
          if (t.type === type) {
            dailyData[dayOfMonth].value += t.amount;
          } else if (overlayType && t.type === overlayType) {
            dailyData[dayOfMonth].value2! += t.amount;
          }
        }
      }
    });
    return dailyData;
  }, [transactions, type, month, overlayType]);

  const hasData = data.some(d => d.value > 0 || (d.value2 && d.value2 > 0));
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
  
  const primaryColor = type === TransactionType.INCOME ? '#00C49F' : '#FF8042';
  const overlayColor = overlayType ? (overlayType === TransactionType.INCOME ? '#00C49F' : '#FF8042') : '';


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
          {overlayType && (
            <Line 
              type="monotone" 
              dataKey="value2" 
              name={overlayType === TransactionType.INCOME ? "Receitas (Comparativo)" : "Despesas (Comparativo)"} 
              stroke={overlayColor} 
              strokeWidth={2} 
              strokeOpacity={0.5} 
              dot={false}
              activeDot={{ r: 5 }}
              strokeDasharray="5 5"
            />
          )}
          <Line 
            type="monotone" 
            dataKey="value" 
            name={type === TransactionType.INCOME ? "Receitas" : "Despesas"} 
            stroke={primaryColor} 
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
