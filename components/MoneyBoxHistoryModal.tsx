
import React from 'react';
import { MoneyBox, MoneyBoxTransaction, MoneyBoxTransactionType, Account, Transaction } from '../types'; // Added Transaction for potential future use
import Modal from './Modal';
import { formatDate, formatCurrency } from '../utils/helpers';
// Import useToasts or pass addToast if you plan to show notifications on delete errors.
// For now, simple window.confirm is used.

interface MoneyBoxHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  moneyBox: MoneyBox;
  transactions: MoneyBoxTransaction[];
  // accounts and allTransactions might be needed if displaying details of linked main transaction
  // accounts: Account[]; 
  // allTransactions: Transaction[]; 
  onDeleteTransaction: (transactionId: string, linkedTransactionId?: string) => void;
  isPrivacyModeEnabled?: boolean;
}

const MoneyBoxHistoryModal: React.FC<MoneyBoxHistoryModalProps> = ({ 
    isOpen, 
    onClose, 
    moneyBox, 
    transactions, 
    // accounts, 
    // allTransactions,
    onDeleteTransaction,
    isPrivacyModeEnabled,
}) => {
  const history = transactions
    .filter(t => t.money_box_id === moneyBox.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Function to potentially find linked transaction details (if needed in future)
  // const getLinkedTransactionInfo = (linkedTxId?: string) => {
  //   if (!linkedTxId || !allTransactions) return null;
  //   const mainTx = allTransactions.find(tx => tx.id === linkedTxId);
  //   if (!mainTx || !accounts) return null;
  //   const account = accounts.find(acc => acc.id === mainTx.account_id);
  //   return {
  //     description: mainTx.description,
  //     accountName: account?.name,
  //     type: mainTx.type === MainTransactionType.EXPENSE ? 'Despesa de' : 'Receita para'
  //   };
  // };


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
            // const linkedInfo = getLinkedTransactionInfo(tx.linked_transaction_id);


            return (
              <li key={tx.id} className="p-3 bg-surface/50 dark:bg-surfaceDark/50 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-semibold ${amountColor}`}>{sign} {formatCurrency(tx.amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
                    <p className="text-sm text-textMuted dark:text-textMutedDark">{formatDate(tx.date)}</p>
                    {tx.description && <p className="text-xs text-textMuted dark:text-textMutedDark italic">{tx.description}</p>}
                    {/* {linkedInfo && (
                        <p className="text-xs text-neutral dark:text-neutralDark">
                            Vinculado: {linkedInfo.type} {linkedInfo.accountName} ({linkedInfo.description})
                        </p>
                    )} */}
                     {tx.linked_transaction_id && (
                        <p className="text-xs text-neutral dark:text-neutralDark">
                            (Vinculado a uma transação principal)
                        </p>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                        // Confirm before deleting
                         if(window.confirm(`Excluir esta transação da caixinha? ${tx.linked_transaction_id ? '\\nA transação principal vinculada NÃO será excluída automaticamente por esta ação.' : ''}`)){
                            onDeleteTransaction(tx.id, tx.linked_transaction_id)
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