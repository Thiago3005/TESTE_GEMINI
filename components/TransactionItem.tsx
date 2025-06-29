
import React from 'react';
import { Transaction, TransactionType, Account, Category, Tag, InstallmentPurchase } from '../types'; 
import { formatDate, formatCurrency } from '../utils/helpers';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import Button from './Button';
import CreditCardIcon from './icons/CreditCardIcon'; // For linked card debit indicator

interface TransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  tags: Tag[]; 
  installmentPurchases: InstallmentPurchase[]; // Added for traceability
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  isPrivacyModeEnabled?: boolean; // New prop
}

const TransactionItem: React.FC<TransactionItemProps> = ({ 
  transaction, accounts, categories, tags, installmentPurchases, onEdit, onDelete, isPrivacyModeEnabled 
}) => {
  const { type, amount, category_id, description, date, account_id, to_account_id, tag_ids, payee_name } = transaction;

  const account = accounts.find(a => a.id === account_id);
  const toAccount = to_account_id ? accounts.find(a => a.id === to_account_id) : null;
  const category = category_id ? categories.find(c => c.id === category_id) : null;
  const transactionTags = tag_ids ? tags.filter(t => tag_ids.includes(t.id)) : [];

  let amountColor = 'text-textBase dark:text-textBaseDark';
  let sign = '';
  if (type === TransactionType.INCOME) {
    amountColor = 'text-secondary dark:text-secondaryDark';
    sign = '+';
  } else if (type === TransactionType.EXPENSE) {
    amountColor = 'text-destructive dark:text-destructiveDark';
    sign = '-';
  }

  let title = description || category?.name || type;
  const subTitleParts: string[] = [];
  if (account) subTitleParts.push(account.name);
  if (type === TransactionType.TRANSFER) {
      if (toAccount) {
        subTitleParts.push(`➔ ${toAccount.name}`);
      } else if (payee_name) {
        subTitleParts.push(`➔ ${payee_name}`);
        if (!description) {
            title = `Transferência para ${payee_name}`;
        }
      }
  } else if (category) {
     subTitleParts.push(category.name);
  }

  const getContrastTextColor = (hexColor?: string): string => {
    if (!hexColor) return 'text-textBase dark:text-textBaseDark'; 
    try {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? 'text-neutral-800' : 'text-white';
    } catch (e) { return 'text-white'; } 
  };

  const isDirectCardDebit = installmentPurchases.some(
    ip => ip.linked_transaction_id === transaction.id && ip.number_of_installments === 1
  );


  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
      <div className="flex-grow">
        <div className="flex items-center space-x-3">
           <span className={`font-semibold text-lg ${amountColor}`}>{sign}{formatCurrency(amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
           <h3 className="text-md font-medium text-textBase dark:text-textBaseDark">{title}</h3>
           {isDirectCardDebit && (
            <span title="Débito em fatura de cartão" className="ml-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full inline-flex items-center">
                <CreditCardIcon className="w-3 h-3 mr-1" /> Cartão
            </span>
           )}
        </div>
        <p className="text-sm text-textMuted dark:text-textMutedDark">
          {formatDate(date)} <span className="mx-1">&bull;</span> {subTitleParts.join(' ')}
        </p>
        {description && category && type !== TransactionType.TRANSFER && <p className="text-xs text-neutral/70 dark:text-neutralDark/70 italic mt-1">{description}</p>}
        
        {transactionTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {transactionTags.map(tag => (
              <span 
                key={tag.id} 
                className={`text-xs font-medium px-2 py-0.5 rounded-full border
                            ${tag.color ? '' : 'bg-neutral/10 dark:bg-neutralDark/20 border-neutral/30 dark:border-neutralDark/40'}`}
                style={tag.color ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
              >
                 <span className={tag.color ? getContrastTextColor(tag.color) : 'text-textBase dark:text-textBaseDark'}>
                    {tag.name}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex space-x-2 self-end sm:self-center">
        <Button variant="ghost" size="sm" onClick={() => onEdit(transaction)} aria-label="Editar">
          <EditIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(transaction.id)} aria-label="Excluir">
          <TrashIcon className="w-4 h-4 text-destructive dark:text-destructiveDark" />
        </Button>
      </div>
    </li>
  );
};

export default TransactionItem;