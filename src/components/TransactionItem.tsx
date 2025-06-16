import React from 'react';
import { Transaction, TransactionType, Account, Category, Tag } from '../types'; // Added Tag
import { formatDate, formatCurrency } from '../utils/helpers';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import Button from './Button';

interface TransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  tags: Tag[]; // New: All available tags
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, accounts, categories, tags, onEdit, onDelete }) => {
  const { type, amount, categoryId, description, date, accountId, toAccountId, tagIds } = transaction;

  const account = accounts.find(a => a.id === accountId);
  const toAccount = toAccountId ? accounts.find(a => a.id === toAccountId) : null;
  const category = categoryId ? categories.find(c => c.id === categoryId) : null;
  const transactionTags = tagIds ? tags.filter(t => tagIds.includes(t.id)) : [];

  let amountColor = 'text-textBase dark:text-textBaseDark';
  let sign = '';
  if (type === TransactionType.INCOME) {
    amountColor = 'text-secondary dark:text-secondaryDark';
    sign = '+';
  } else if (type === TransactionType.EXPENSE) {
    amountColor = 'text-destructive dark:text-destructiveDark';
    sign = '-';
  }

  const title = description || category?.name || type;
  const subTitleParts: string[] = [];
  if (account) subTitleParts.push(account.name);
  if (type === TransactionType.TRANSFER && toAccount) {
    subTitleParts.push(`➔ ${toAccount.name}`);
  } else if (category && type !== TransactionType.TRANSFER) {
     subTitleParts.push(category.name);
  }

  // Helper function to get contrast text color (copied from TagItem for consistency)
  const getContrastTextColor = (hexColor?: string): string => {
    if (!hexColor) return 'text-textBase dark:text-textBaseDark'; // Default case, should not happen if color is set
    try {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? 'text-neutral-800' : 'text-white';
    } catch (e) { return 'text-white'; } // fallback
  };


  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
      <div className="flex-grow">
        <div className="flex items-center space-x-3">
           <span className={`font-semibold text-lg ${amountColor}`}>{sign}{formatCurrency(amount)}</span>
           <h3 className="text-md font-medium text-textBase dark:text-textBaseDark">{title}</h3>
        </div>
        <p className="text-sm text-textMuted dark:text-textMutedDark">
          {formatDate(date)} <span className="mx-1">&bull;</span> {subTitleParts.join(' ')}
        </p>
        {description && category && type !== TransactionType.TRANSFER && <p className="text-xs text-neutral/70 dark:text-neutralDark/70 italic mt-1">{description}</p>}
        
        {/* Display Tags */}
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