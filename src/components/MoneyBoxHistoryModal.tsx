
import React from 'react';
import { MoneyBox, MoneyBoxTransaction, MoneyBoxTransactionType, Account } from '../types';
import Modal from './Modal';
import { formatDate, formatCurrency } from '../utils/helpers';

interface MoneyBoxHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  moneyBox: MoneyBox;
  transactions: MoneyBoxTransaction[];
  accounts: Account[];
  onDeleteTransaction: (transactionId: string, linkedTransactionId?: string) => void;
}

const MoneyBoxHistoryModal: React.FC<MoneyBoxHistoryModalProps> = ({ 
    isOpen, 
    onClose, 
    moneyBox, 
    transactions, 
    accounts,
    onDeleteTransaction
}) => {
  const history = transactions
    .filter(t => t.moneyBoxId === moneyBox.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Histórico: ${moneyBox.name}`} size="lg">
      {history.length === 0 ? (
        <p className="text-textMuted dark:text-textMutedDark text-center py-4">Nenhuma transação nesta caixinha ainda.</p>
      ) : (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {history.map(tx => {
            const isDeposit = tx.type === MoneyBoxTransactionType.DEPOSIT;
            const amountColor = isDeposit ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark';
            const sign = isDeposit ? '+' : '-';
            const linkedAccount = accounts.find(acc => acc.id === tx.linkedAccountId);

            return (
              <li key={tx.id} className="p-3 bg-surface/50 dark:bg-surfaceDark/50 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-semibold ${amountColor}`}>{sign} {formatCurrency(tx.amount)}</p>
                    <p className="text-sm text-textMuted dark:text-textMutedDark">{formatDate(tx.date)}</p>
                    {tx.description && <p className="text-xs text-textMuted dark:text-textMutedDark italic">{tx.description}</p>}
                     {linkedAccount && (
                        <p className="text-xs text-neutral dark:text-neutralDark">
                            Vinculado: {isDeposit ? 'Despesa de' : 'Receita para'} {linkedAccount.name}
                        </p>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                        if(window.confirm(`Excluir esta transação da caixinha? ${tx.linkedTransactionId ? '\nA transação principal vinculada NÃO será excluída automaticamente por esta ação.' : ''}`)){
                            onDeleteTransaction(tx.id, tx.linkedTransactionId)
                        }
                    }}
                    className="text-xs text-destructive dark:text-destructiveDark hover:underline"
                    aria-label="Excluir transação da caixinha"
                    title="Excluir transação da caixinha"
                   >
                    Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};

export default MoneyBoxHistoryModal;