
import React from 'react';
import { useState, useMemo } from 'react';
import { MoneyBox, Account, MoneyBoxTransaction, MoneyBoxTransactionType } from '../types';
import MoneyBoxItem from './MoneyBoxItem';
import MoneyBoxFormModal from './MoneyBoxFormModal';
import MoneyBoxTransactionFormModal from './MoneyBoxTransactionFormModal';
import MoneyBoxHistoryModal from './MoneyBoxHistoryModal';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import { formatCurrency } from '../utils/helpers';
import TrashIcon from './icons/TrashIcon'; // Import TrashIcon


interface MoneyBoxesViewProps {
  moneyBoxes: MoneyBox[];
  moneyBoxTransactions: MoneyBoxTransaction[];
  accounts: Account[];
  onAddMoneyBox: (moneyBox: Omit<MoneyBox, 'id'|'user_id'|'created_at'|'updated_at'>) => void;
  onUpdateMoneyBox: (moneyBox: MoneyBox) => void;
  onDeleteMoneyBox: (moneyBoxId: string) => void; // New prop for deleting money box itself
  onAddMoneyBoxTransaction: (transaction: Omit<MoneyBoxTransaction, 'id'|'user_id'|'created_at'|'updated_at'|'linked_transaction_id'>, createLinkedTransaction: boolean, linkedAccountId?: string) => void;
  onDeleteMoneyBoxTransaction: (transactionId: string, linkedTransactionId?: string) => void;
  calculateMoneyBoxBalance: (moneyBoxId: string) => number;
  isPrivacyModeEnabled?: boolean;
}

const MoneyBoxesView: React.FC<MoneyBoxesViewProps> = ({
  moneyBoxes,
  moneyBoxTransactions,
  accounts,
  onAddMoneyBox,
  onUpdateMoneyBox,
  onDeleteMoneyBox, // Use new prop
  onAddMoneyBoxTransaction,
  onDeleteMoneyBoxTransaction,
  calculateMoneyBoxBalance,
  isPrivacyModeEnabled,
}) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMoneyBox, setEditingMoneyBox] = useState<MoneyBox | null>(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedMoneyBoxForTransaction, setSelectedMoneyBoxForTransaction] = useState<MoneyBox | null>(null);
  const [currentTransactionType, setCurrentTransactionType] = useState<MoneyBoxTransactionType>(MoneyBoxTransactionType.DEPOSIT);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMoneyBoxForHistory, setSelectedMoneyBoxForHistory] = useState<MoneyBox | null>(null);


  const openFormModalForNew = () => {
    setEditingMoneyBox(null);
    setIsFormModalOpen(true);
  };

  const openFormModalForEdit = (moneyBox: MoneyBox) => {
    setEditingMoneyBox(moneyBox);
    setIsFormModalOpen(true);
  };

  const openTransactionModal = (moneyBox: MoneyBox, type: MoneyBoxTransactionType) => {
    setSelectedMoneyBoxForTransaction(moneyBox);
    setCurrentTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  const openHistoryModal = (moneyBox: MoneyBox) => {
    setSelectedMoneyBoxForHistory(moneyBox);
    setIsHistoryModalOpen(true);
  };
  
  const handleDeleteMoneyBoxClick = (moneyBoxId: string) => {
    // Confirmation and actual deletion logic is handled by onDeletMoneyBox in App.tsx
    onDeleteMoneyBox(moneyBoxId);
  };

  const totalSavedInMoneyBoxes = useMemo(() => {
    return moneyBoxes.reduce((sum, mb) => sum + calculateMoneyBoxBalance(mb.id), 0);
  }, [moneyBoxes, calculateMoneyBoxBalance]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Minhas Caixinhas</h1>
          {moneyBoxes.length > 0 && (
             <p className="text-sm text-textMuted dark:text-textMutedDark">
                Total guardado: <span className="font-semibold text-secondary dark:text-secondaryDark">{formatCurrency(totalSavedInMoneyBoxes, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
            </p>
          )}
        </div>
        <Button onClick={openFormModalForNew} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Caixinha
        </Button>
      </div>

      {moneyBoxes.length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moneyBoxes.map(mb => (
            <MoneyBoxItem
              key={mb.id}
              moneyBox={mb}
              balance={calculateMoneyBoxBalance(mb.id)}
              onEdit={openFormModalForEdit}
              onDelete={handleDeleteMoneyBoxClick} // Updated prop name
              onOpenTransactionModal={openTransactionModal}
              onOpenHistoryModal={openHistoryModal}
              isPrivacyModeEnabled={isPrivacyModeEnabled}
              hasTransactions={moneyBoxTransactions.some(mbt => mbt.money_box_id === mb.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma caixinha criada. Crie uma para começar a guardar dinheiro!</p>
      )}

      <MoneyBoxFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={editingMoneyBox ? onUpdateMoneyBox : onAddMoneyBox}
        existingMoneyBox={editingMoneyBox}
      />

      {selectedMoneyBoxForTransaction && (
        <MoneyBoxTransactionFormModal
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSave={onAddMoneyBoxTransaction}
          moneyBox={selectedMoneyBoxForTransaction}
          accounts={accounts}
          transactionType={currentTransactionType}
        />
      )}

      {selectedMoneyBoxForHistory && (
        <MoneyBoxHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          moneyBox={selectedMoneyBoxForHistory}
          transactions={moneyBoxTransactions}
          onDeleteTransaction={onDeleteMoneyBoxTransaction}
          isPrivacyModeEnabled={isPrivacyModeEnabled}
        />
      )}
    </div>
  );
};

export default MoneyBoxesView;