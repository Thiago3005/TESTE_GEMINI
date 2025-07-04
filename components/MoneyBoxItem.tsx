import React from 'react';
import { MoneyBox, MoneyBoxTransactionType } from '../types';
import { formatCurrency } from '../utils/helpers';
import Button from './Button';
import PiggyBankIcon from './icons/PiggyBankIcon';
import PlusIcon from './icons/PlusIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon'; // Import TrashIcon

interface MoneyBoxItemProps {
  moneyBox: MoneyBox;
  balance: number;
  onEdit: (moneyBox: MoneyBox) => void;
  onDelete: (moneyBoxId: string) => void; // New prop for deleting the money box itself
  onOpenTransactionModal: (moneyBox: MoneyBox, type: MoneyBoxTransactionType) => void;
  onOpenHistoryModal: (moneyBox: MoneyBox) => void;
  isPrivacyModeEnabled?: boolean;
  hasTransactions: boolean; // New prop
}

const MoneyBoxItem: React.FC<MoneyBoxItemProps> = ({
  moneyBox,
  balance,
  onEdit,
  onDelete,
  onOpenTransactionModal,
  onOpenHistoryModal,
  isPrivacyModeEnabled,
  hasTransactions,
}) => {
  const progressPercent = moneyBox.goal_amount && moneyBox.goal_amount > 0
    ? Math.min((balance / moneyBox.goal_amount) * 100, 100)
    : 0;

  const accentStyle = moneyBox.color ? { borderLeftColor: moneyBox.color, borderLeftWidth: '4px' } : {};
  const progressBarStyle = moneyBox.color ? { backgroundColor: moneyBox.color } : {backgroundColor: 'var(--color-primary)'};

  return (
    <li
      className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 space-y-3"
      style={accentStyle}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <div className="flex items-center space-x-2 mb-1">
            <PiggyBankIcon className="w-6 h-6" style={{color: moneyBox.color || 'currentColor'}} />
            <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">{moneyBox.name}</h3>
          </div>
          <p className="text-2xl font-bold" style={{color: moneyBox.color || 'var(--color-primary)'}}>
            {formatCurrency(balance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
          {moneyBox.goal_amount && moneyBox.goal_amount > 0 && (
            <p className="text-xs text-textMuted dark:text-textMutedDark">
              Meta: {formatCurrency(moneyBox.goal_amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end space-y-1">
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(moneyBox)} aria-label="Editar Caixinha" className="!p-1.5">
              <EditIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(moneyBox.id)}
              aria-label="Excluir Caixinha"
              className="!p-1.5"
              disabled={hasTransactions}
              title={hasTransactions ? "Não pode excluir caixinhas com transações" : "Excluir caixinha"}
            >
              <TrashIcon className={`w-4 h-4 ${hasTransactions ? 'text-neutral/50 dark:text-neutralDark/50' : 'text-destructive dark:text-destructiveDark'}`} />
            </Button>
          </div>
           <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenHistoryModal(moneyBox)}
            aria-label="Ver Histórico"
            className="text-xs !px-2 !py-1"
          >
            Histórico
          </Button>
        </div>
      </div>

      {moneyBox.goal_amount && moneyBox.goal_amount > 0 && (
        <div className="w-full progress-bar-bg rounded-full h-2.5 dark:progress-bar-bg">
          <div
            className="h-2.5 rounded-full"
            style={{ width: `${progressPercent}%`, ...progressBarStyle }}
          ></div>
        </div>
      )}

      <div className="flex justify-start space-x-2 pt-1">
        <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenTransactionModal(moneyBox, MoneyBoxTransactionType.DEPOSIT)}
            className="!bg-opacity-80 dark:!bg-opacity-80"
            style={moneyBox.color ? { backgroundColor: moneyBox.color } : {}}
        >
          <PlusIcon className="w-4 h-4 mr-1" /> Depositar
        </Button>
        <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenTransactionModal(moneyBox, MoneyBoxTransactionType.WITHDRAWAL)}
            className="border border-borderBase dark:border-borderBaseDark"
        >
          Sacar
        </Button>
      </div>
    </li>
  );
};

export default MoneyBoxItem;
