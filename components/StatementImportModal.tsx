
import React, { useState, useEffect } from 'react';
import { ReviewedTransaction, Account, Category, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';
import SparklesIcon from './icons/SparklesIcon';

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: ReviewedTransaction[];
  accounts: Account[];
  categories: Category[];
  onConfirm: (transactionsToImport: ReviewedTransaction[]) => void;
  isLoading: boolean;
}

const StatementImportModal: React.FC<StatementImportModalProps> = ({
  isOpen,
  onClose,
  transactions: initialTransactions,
  accounts,
  categories,
  onConfirm,
  isLoading,
}) => {
  const [reviewedTxs, setReviewedTxs] = useState<ReviewedTransaction[]>([]);

  useEffect(() => {
    setReviewedTxs(initialTransactions);
  }, [initialTransactions]);

  const handleToggleSelect = (id: string) => {
    setReviewedTxs(prev =>
      prev.map(tx => (tx.id === id ? { ...tx, selected: !tx.selected } : tx))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setReviewedTxs(prev => prev.map(tx => ({ ...tx, selected: select })));
  };

  const handleFieldChange = (id: string, field: 'accountId' | 'categoryId', value: string) => {
    setReviewedTxs(prev =>
      prev.map(tx => (tx.id === id ? { ...tx, [field]: value } : tx))
    );
  };

  const handleConfirmClick = () => {
    const toImport = reviewedTxs.filter(tx => tx.selected);
    onConfirm(toImport);
  };
  
  const totalSelected = reviewedTxs.filter(tx => tx.selected).length;
  const allSelected = totalSelected === reviewedTxs.length && reviewedTxs.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Revisar Transações do Extrato" size="2xl">
      <div className="space-y-4">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3 p-10">
                <SparklesIcon className="w-12 h-12 text-primary dark:text-primaryDark animate-pulse" />
                <p className="text-textMuted dark:text-textMutedDark">Analisando o extrato com a IA...</p>
                <p className="text-xs text-textMuted dark:text-textMutedDark">Isso pode levar alguns segundos.</p>
            </div>
        ) : reviewedTxs.length === 0 ? (
            <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma transação foi extraída do documento. Tente uma imagem mais nítida.</p>
        ) : (
          <>
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                <p className="text-sm font-medium">{totalSelected} de {reviewedTxs.length} transações selecionadas.</p>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleSelectAll(!allSelected)}>
                        {allSelected ? 'Desmarcar Todas' : 'Marcar Todas'}
                    </Button>
                </div>
            </div>
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
              {reviewedTxs.map(tx => {
                const typeColor = tx.type === TransactionType.INCOME ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark';
                const sign = tx.type === TransactionType.INCOME ? '+' : '-';
                return (
                  <li key={tx.id} className={`p-3 rounded-lg flex flex-col md:flex-row gap-4 transition-colors ${tx.selected ? 'bg-surface dark:bg-surfaceDark' : 'bg-neutral/30 dark:bg-neutralDark/30 opacity-60'}`}>
                    <div className="flex items-center flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={tx.selected}
                            onChange={() => handleToggleSelect(tx.id)}
                            className="w-5 h-5 text-primary rounded border-neutral/50 focus:ring-primary dark:text-primaryDark dark:border-neutralDark/50 dark:focus:ring-primaryDark"
                        />
                    </div>
                    <div className="flex-grow space-y-1">
                      <div className="flex justify-between items-baseline">
                        <p className="font-semibold text-textBase dark:text-textBaseDark">{tx.description}</p>
                        <p className={`font-bold text-lg ${typeColor}`}>{sign} {formatCurrency(tx.amount)}</p>
                      </div>
                      <p className="text-xs text-textMuted dark:text-textMutedDark">{formatDate(tx.date)}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                         <Select
                            label="Conta"
                            value={tx.accountId}
                            onChange={(e) => handleFieldChange(tx.id, 'accountId', e.target.value)}
                            options={accounts.map(a => ({ value: a.id, label: a.name }))}
                            disabled={!tx.selected}
                            className="text-xs"
                         />
                         <Select
                            label="Categoria"
                            value={tx.categoryId}
                            onChange={(e) => handleFieldChange(tx.id, 'categoryId', e.target.value)}
                            options={categories.filter(c => c.type === tx.type).map(c => ({ value: c.id, label: c.name }))}
                            disabled={!tx.selected}
                            placeholder="Selecione..."
                            className="text-xs"
                         />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="flex justify-end space-x-3 pt-4 border-t border-borderBase dark:border-borderBaseDark">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirmClick} disabled={isLoading || totalSelected === 0}>
            {isLoading ? 'Importando...' : `Importar ${totalSelected} Transações`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StatementImportModal;