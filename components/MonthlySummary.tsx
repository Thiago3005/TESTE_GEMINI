
import React, { useState } from 'react';
import { Transaction, Category, TransactionType } from '../types';
import { getISODateString, formatDate } from '../utils/helpers';
import Button from './Button';
import CategoryChart from './CategoryChart';
import CategoryBarChart from './CategoryBarChart';
import BarChartIcon from './icons/BarChartIcon';
import ChartPieIcon from './icons/ChartPieIcon';

interface MonthlySummaryProps {
  transactions: Transaction[];
  categories: Category[];
  isPrivacyModeEnabled?: boolean;
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({ transactions, categories, isPrivacyModeEnabled }) => {
  const [dataType, setDataType] = useState<TransactionType.EXPENSE | TransactionType.INCOME>(TransactionType.EXPENSE);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const currentMonth = getISODateString().substring(0, 7);
  const monthLabel = formatDate(currentMonth + '-02T00:00:00', 'pt-BR', { month: '2-digit', year: 'numeric' });

  return (
    <div className="bg-surface dark:bg-surfaceDark p-4 sm:p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark">Resumo Mensal ({monthLabel})</h2>
        <div className="flex items-center gap-2">
          {/* Data Type Toggle */}
          <div className="flex items-center bg-neutral/10 dark:bg-neutralDark/20 rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDataType(TransactionType.EXPENSE)}
              className={`!px-3 !py-1 !text-xs ${dataType === TransactionType.EXPENSE ? 'bg-white dark:bg-surface shadow' : ''}`}
            >
              Despesas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDataType(TransactionType.INCOME)}
              className={`!px-3 !py-1 !text-xs ${dataType === TransactionType.INCOME ? 'bg-white dark:bg-surface shadow' : ''}`}
            >
              Receitas
            </Button>
          </div>
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-neutral/10 dark:bg-neutralDark/20 rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartType('bar')}
              className={`!p-2 ${chartType === 'bar' ? 'bg-white dark:bg-surface shadow' : ''}`}
              title="Gráfico de Barras"
            >
              <BarChartIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChartType('pie')}
              className={`!p-2 ${chartType === 'pie' ? 'bg-white dark:bg-surface shadow' : ''}`}
              title="Gráfico de Pizza"
            >
              <ChartPieIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-4">
        {isPrivacyModeEnabled ? (
          <p className="text-center text-textMuted dark:text-textMutedDark py-8">Gráfico oculto em Modo Privacidade.</p>
        ) : chartType === 'bar' ? (
          <CategoryBarChart transactions={transactions} type={dataType} month={currentMonth} />
        ) : (
          <CategoryChart transactions={transactions} categories={categories} type={dataType} month={currentMonth} />
        )}
      </div>
    </div>
  );
};

export default MonthlySummary;
