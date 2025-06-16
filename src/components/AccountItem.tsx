
import React from 'react';
import { Account } from '../types';
import { formatCurrency } from '../utils/helpers';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import Button from './Button';
import CreditCardIcon from './icons/CreditCardIcon'; // Assuming this is generic enough for bank accounts too


interface AccountItemProps {
  account: Account;
  balance: number;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  transactionCount: number;
}

const AccountItem: React.FC<AccountItemProps> = ({ account, balance, onEdit, onDelete, transactionCount }) => {
  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150">
      <div className="flex justify-between items-start">
        <div>
            <div className="flex items-center space-x-2">
                <CreditCardIcon className="w-6 h-6 text-primary dark:text-primaryDark" />
                <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">{account.name}</h3>
            </div>
          <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark mt-1">Saldo Inicial: {formatCurrency(account.initialBalance)}</p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(account)} aria-label="Editar Conta">
              <EditIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(account.id)} 
              aria-label="Excluir Conta"
              disabled={transactionCount > 0}
              title={transactionCount > 0 ? "Não pode excluir contas com transações associadas" : "Excluir conta"}
            >
              <TrashIcon className={`w-4 h-4 ${transactionCount > 0 ? 'text-neutral/50 dark:text-neutralDark/50' : 'text-destructive dark:text-destructiveDark'}`} />
            </Button>
          </div>
           {transactionCount > 0 && (
             <p className="text-xs text-textMuted dark:text-textMutedDark text-right">Possui {transactionCount} transaçõe(s)</p>
           )}
        </div>
      </div>
    </li>
  );
};

export default AccountItem;