
import React from 'react';
import { useState, useMemo } from 'react';
import { RecurringTransaction, Account, Category, CreditCard } from '../types'; // Added CreditCard
import RecurringTransactionItem from './RecurringTransactionItem';
import RecurringTransactionFormModal from './RecurringTransactionFormModal';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import { getISODateString } from '../utils/helpers';
import ArrowPathIcon from './icons/ArrowPathIcon'; // For AI button

interface RecurringTransactionsViewProps {
  recurringTransactions: RecurringTransaction[];
  accounts: Account[];
  creditCards: CreditCard[]; // Added creditCards
  categories: Category[];
  onAddRecurringTransaction: (rt: Omit<RecurringTransaction, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>, postNow: boolean) => void;
  onUpdateRecurringTransaction: (rt: RecurringTransaction) => void;
  onDeleteRecurringTransaction: (rtId: string) => void;
  onProcessRecurringTransactions: () => Promise<{ count: number; errors: string[] }>; 
  isPrivacyModeEnabled?: boolean; 
  onFetchRecurringPaymentCandidates: () => void; // New prop for AI analysis
}

const RecurringTransactionsView: React.FC<RecurringTransactionsViewProps> = ({
  recurringTransactions,
  accounts,
  creditCards, // Destructure creditCards
  categories,
  onAddRecurringTransaction,
  onUpdateRecurringTransaction,
  onDeleteRecurringTransaction,
  onProcessRecurringTransactions,
  isPrivacyModeEnabled,
  onFetchRecurringPaymentCandidates, // Destructure new prop
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRT, setEditingRT] = useState<RecurringTransaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const openModalForNew = () => {
    setEditingRT(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (rt: RecurringTransaction) => {
    setEditingRT(rt);
    setIsModalOpen(true);
  };

  const handleModalSave = (
      rtData: Omit<RecurringTransaction, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>,
      postNow: boolean
  ) => {
      if (editingRT) {
          onUpdateRecurringTransaction({ ...rtData, id: editingRT.id } as RecurringTransaction);
      } else {
          onAddRecurringTransaction(rtData, postNow);
      }
  };


  const handleProcess = async () => {
    setIsProcessing(true);
    setProcessingMessage('Processando...');
    try {
      const result = await onProcessRecurringTransactions();
      if (result.errors.length > 0) {
        setProcessingMessage(`Processamento concluído. ${result.count} transações lançadas. Erros: ${result.errors.join(', ')}`);
      } else if (result.count > 0) {
        setProcessingMessage(`${result.count} transações recorrentes foram lançadas com sucesso!`);
      } else {
        setProcessingMessage('Nenhuma transação recorrente pendente para lançar.');
      }
    } catch (error) {
      setProcessingMessage('Erro ao processar transações recorrentes.');
      console.error(error);
    }
    setIsProcessing(false);
    setTimeout(() => setProcessingMessage(null), 7000);
  };
  
  const sortedRTs = useMemo(() => {
    return [...recurringTransactions].sort((a,b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
  }, [recurringTransactions]);

  const today = getISODateString();
  const upcomingRTs = sortedRTs.filter(rt => !rt.is_paused && rt.next_due_date >= today);
  const pastDueRTs = sortedRTs.filter(rt => !rt.is_paused && rt.next_due_date < today);
  const pausedRTs = sortedRTs.filter(rt => rt.is_paused);


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Transações Recorrentes</h1>
        <div className="flex flex-wrap gap-2">
            <Button onClick={onFetchRecurringPaymentCandidates} variant="ghost" size="sm" className="!text-sm">
                <ArrowPathIcon className="w-4 h-4 mr-1.5 text-blue-500 dark:text-blue-400" />
                Analisar com IA
            </Button>
            <Button onClick={handleProcess} variant="secondary" disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Lançar Pendentes'}
            </Button>
            <Button onClick={openModalForNew} variant="primary">
                <PlusIcon className="w-5 h-5 mr-2" />
                Nova Recorrência
            </Button>
        </div>
      </div>
      
      {processingMessage && (
        <div className={`p-3 rounded-md text-sm ${processingMessage.includes('Erro') || processingMessage.includes('Erros:') ? 'bg-destructive/10 text-destructiveDark' : 'bg-secondary/10 text-secondaryDark'}`}>
            {processingMessage}
        </div>
      )}

      {recurringTransactions.length === 0 ? (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma transação recorrente cadastrada.</p>
      ) : (
        <>
          {pastDueRTs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-destructive dark:text-destructiveDark mb-2">Pendentes / Atrasadas ({pastDueRTs.length})</h2>
              <ul className="space-y-3">
                {pastDueRTs.map(rt => (
                  <RecurringTransactionItem key={rt.id} rt={rt} accounts={accounts} creditCards={creditCards} categories={categories} onEdit={openModalForEdit} onDelete={onDeleteRecurringTransaction} isPrivacyModeEnabled={isPrivacyModeEnabled} />
                ))}
              </ul>
            </div>
          )}

          {upcomingRTs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-textBase dark:text-textBaseDark mt-6 mb-2">Próximas ({upcomingRTs.length})</h2>
              <ul className="space-y-3">
                {upcomingRTs.map(rt => (
                  <RecurringTransactionItem key={rt.id} rt={rt} accounts={accounts} creditCards={creditCards} categories={categories} onEdit={openModalForEdit} onDelete={onDeleteRecurringTransaction} isPrivacyModeEnabled={isPrivacyModeEnabled} />
                ))}
              </ul>
            </div>
          )}
          
          {pausedRTs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-textMuted dark:text-textMutedDark mt-6 mb-2">Pausadas ({pausedRTs.length})</h2>
              <ul className="space-y-3">
                {pausedRTs.map(rt => (
                  <RecurringTransactionItem key={rt.id} rt={rt} accounts={accounts} creditCards={creditCards} categories={categories} onEdit={openModalForEdit} onDelete={onDeleteRecurringTransaction} isPrivacyModeEnabled={isPrivacyModeEnabled} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <RecurringTransactionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        accounts={accounts}
        creditCards={creditCards} // Pass creditCards here
        categories={categories}
        existingRT={editingRT}
      />
    </div>
  );
};

export default RecurringTransactionsView;
