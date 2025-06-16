import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { Transaction, Category, TransactionType, ChartData } from '../types';
import { formatCurrency } from '../utils/helpers';

interface CategoryChartProps {
  transactions: Transaction[];
  categories: Category[];
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  month: string; // YYYY-MM
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82ca9d', '#ffc658', '#a4de6c', '#d0ed57', '#ff7300',
  '#4CAF50', '#F44336', '#E91E63', '#9C27B0', '#3F51B5'
];

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface dark:bg-surfaceDark p-2 border border-borderBase dark:border-borderBaseDark rounded shadow-lg">
        <p className="text-sm text-textBase dark:text-textBaseDark">{`${payload[0].name} : ${formatCurrency(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};


const CategoryChart: React.FC<CategoryChartProps> = ({ transactions, categories, type, month }) => {
  const data: ChartData[] = React.useMemo(() => {
    const relevantTransactions = transactions.filter(t => 
      t.type === type && 
      t.date.startsWith(month) &&
      t.categoryId 
    );

    const groupedData: { [key: string]: number } = {};
    relevantTransactions.forEach(t => {
      if (t.categoryId) { // Ensure categoryId exists
        groupedData[t.categoryId] = (groupedData[t.categoryId] || 0) + t.amount;
      }
    });

    return Object.entries(groupedData)
      .map(([categoryId, totalAmount]) => {
        const category = categories.find(c => c.id === categoryId);
        return {
          name: category ? category.name : 'Desconhecido',
          value: totalAmount,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, type, month]);

  if (data.length === 0) {
    return <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhum dado para exibir no gráfico para {type === TransactionType.INCOME ? 'receitas' : 'despesas'} este mês.</p>;
  }

  return (
    <div className="w-full h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius="80%"
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              const isDark = document.documentElement.classList.contains('dark');
              if ((percent * 100) < 5) return null; // Don't show label for small slices
              return (
                <text x={x} y={y} fill={isDark? "#FFF" : "#FFF"} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
          >
            {data.map((_entry, index) => ( // entry -> _entry
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(value, _entry) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryChart;
