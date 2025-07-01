import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { Transaction, TransactionType, ChartData } from '../types';
import { formatCurrency, getISODateString } from '../utils/helpers';

interface DailySummaryBarChartProps {
  transactions: Transaction[];
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  month: string; // YYYY-MM
  isPrivacyModeEnabled?: boolean;
  overlayType?: TransactionType.INCOME | TransactionType.EXPENSE;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    const primaryPayload = payload.find((p: any) => p.dataKey === 'value');
    const overlayPayload = payload.find((p: any) => p.dataKey === 'value2');

    return (
      <div className="bg-surface dark:bg-surfaceDark p-3 border border-borderBase dark:border-borderBaseDark rounded shadow-lg max-w-xs backdrop-blur-sm">
        <p className="text-sm font-semibold text-textBase dark:text-textBaseDark">Dia {label}</p>
        {primaryPayload && primaryPayload.value > 0 && (
          <div className="mt-1">
            <p className="text-sm font-medium" style={{ color: primaryPayload.fill }}>
              {primaryPayload.name}: {formatCurrency(primaryPayload.value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
            </p>
            {primaryPayload.payload.descriptions.length > 0 && (
              <ul className="text-xs text-textMuted dark:text-textMutedDark list-disc list-inside space-y-0.5 mt-1">
                {primaryPayload.payload.descriptions.slice(0, 3).map((desc: string, index: number) => (
                  <li key={`d1-${index}`} className="truncate">{desc}</li>
                ))}
                {primaryPayload.payload.descriptions.length > 3 && <li>...</li>}
              </ul>
            )}
          </div>
        )}
        {overlayPayload && overlayPayload.value > 0 && (
           <div className="mt-2 pt-2 border-t border-borderBase/50 dark:border-borderBaseDark/50">
            <p className="text-sm font-medium" style={{ color: overlayPayload.fill }}>
              {overlayPayload.name}: {formatCurrency(overlayPayload.value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
            </p>
            {overlayPayload.payload.overlayDescriptions.length > 0 && (
              <ul className="text-xs text-textMuted dark:text-textMutedDark list-disc list-inside space-y-0.5 mt-1">
                {overlayPayload.payload.overlayDescriptions.slice(0, 3).map((desc: string, index: number) => (
                  <li key={`d2-${index}`} className="truncate">{desc}</li>
                ))}
                {overlayPayload.payload.overlayDescriptions.length > 3 && <li>...</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const DailySummaryBarChart: React.FC<DailySummaryBarChartProps> = ({ transactions, type, month, isPrivacyModeEnabled, overlayType }) => {
  const data = React.useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    const dailyData: (ChartData & { value2?: number, overlayDescriptions?: string[] })[] = Array.from({ length: daysInMonth }, (_, i) => ({
      name: (i + 1).toString().padStart(2, '0'),
      value: 0,
      value2: 0,
      descriptions: [],
      overlayDescriptions: [],
    }));

    transactions.forEach(t => {
      if (t.date.startsWith(month)) {
        const dayOfMonth = parseInt(t.date.split('-')[2], 10) -1;
        if (dayOfMonth >= 0 && dayOfMonth < daysInMonth && dailyData[dayOfMonth]) {
          if (t.type === type) {
            dailyData[dayOfMonth].value += t.amount;
            if (dailyData[dayOfMonth].descriptions) {
              dailyData[dayOfMonth].descriptions!.push(t.description || (type === TransactionType.INCOME ? "Receita" : "Despesa"));
            }
          } else if (overlayType && t.type === overlayType) {
            dailyData[dayOfMonth].value2! += t.amount;
            if (dailyData[dayOfMonth].overlayDescriptions) {
              dailyData[dayOfMonth].overlayDescriptions!.push(t.description || (overlayType === TransactionType.INCOME ? "Receita" : "Despesa"));
            }
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


  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (height < 20 || isPrivacyModeEnabled) {
      return null;
    }
    const formattedValue = formatCurrency(value, 'BRL', 'pt-BR', false).replace(/\s/g, '');
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
            top: 25, right: 0, left: -10, bottom: 5,
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
            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15 / 10) * 10]}
           />
          <Tooltip content={<CustomTooltip isPrivacyModeEnabled={isPrivacyModeEnabled} />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}/>
          <Legend 
            formatter={(value) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} 
            wrapperStyle={{ paddingTop: '20px' }}
          />
          {overlayType && <Bar dataKey="value2" name={overlayType === TransactionType.INCOME ? "Receitas (Comparativo)" : "Despesas (Comparativo)"} fill={overlayColor} fillOpacity={0.3} radius={[4, 4, 0, 0]} />}
          <Bar dataKey="value" name={type === TransactionType.INCOME ? "Receitas" : "Despesas"} fill={primaryColor} radius={[4, 4, 0, 0]} filter="url(#shadow)">
             <LabelList dataKey="value" content={renderCustomizedLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailySummaryBarChart;
