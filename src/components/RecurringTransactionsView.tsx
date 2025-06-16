import React from 'react';
import { RecurringTransaction, Account, Category } from '../types';

interface RecurringTransactionsViewProps {
  recurringTransactions: RecurringTransaction[];
  accounts: Account[];
  categories: Category[];
  onAddRecurringTransaction: (rt: RecurringTransaction) => void;
  onUpdateRecurringTransaction: (updatedRT: RecurringTransaction) => void;
  onDeleteRecurringTransaction: (rtId: string) => void;
  onProcessRecurringTransactions: () => void;
}

const RecurringTransactionsView: React.FC<RecurringTransactionsViewProps> = () => {
  return (
    <div>
      <h2>Transações Recorrentes</h2>
      {/* Conteúdo do componente */}
    </div>
  );
};

export default RecurringTransactionsView; 