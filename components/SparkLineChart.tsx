
import React from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { formatCurrency } from '../utils/helpers';

interface SparkLineChartProps {
  data: { date: string; balance: number }[];
  isPrivacyModeEnabled?: boolean;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface dark:bg-surfaceDark p-2 border border-borderBase dark:border-borderBaseDark rounded shadow-lg text-xs">
        <p className="font-semibold text-textBase dark:text-textBaseDark">{label}</p>
        <p className="text-primary dark:text-primaryDark">{formatCurrency(payload[0].value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
      </div>
    );
  }
  return null;
};

const SparkLineChart: React.FC<SparkLineChartProps> = ({ data, isPrivacyModeEnabled }) => {
  const lineCo lor = (data[data.length - 1]?.balance ?? 0) >= (data[0]?.balance ?? 0) ? '#22c55e' : '#ef4444';

  return (
    <ResponsiveContainer width="100%" height={50}>
      <LineChart data={data}>
        <Tooltip content={<CustomTooltip isPrivacyModeEnabled={isPrivacyModeEnabled} />} />
        <Line
          type="monotone"
          dataKey="balance"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SparkLineChart;
