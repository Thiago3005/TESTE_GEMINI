
import React from 'react';
import { Category, TransactionType, Transaction } from '../types'; // Added Transaction
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import Button from './Button';
import TagIcon from './icons/TagIcon';
import { formatCurrency, getISODateString } from '../utils/helpers'; // Added getISODateString

interface CategoryItemProps {
  category: Category;
  transactions: Transaction[]; // New: for calculating spending
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  transactionCount: number;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, transactions, onEdit, onDelete, transactionCount }) => {
  const typeColor = category.type === TransactionType.INCOME 
    ? 'text-secondary dark:text-secondaryDark' 
    : 'text-destructive dark:text-destructiveDark';
  const typeLabel = category.type === TransactionType.INCOME ? 'Receita' : 'Despesa';

  const currentMonthYYYYMM = getISODateString().substring(0, 7);
  const monthlySpending = category.type === TransactionType.EXPENSE && category.monthlyBudget
    ? transactions
        .filter(t => t.categoryId === category.id && t.date.startsWith(currentMonthYYYYMM) && t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;
  
  const budgetProgress = category.monthlyBudget && category.monthlyBudget > 0
    ? Math.min((monthlySpending / category.monthlyBudget) * 100, 100)
    : 0;
  
  const isOverBudget = category.monthlyBudget && monthlySpending > category.monthlyBudget;

  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 flex flex-col">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3">
          <TagIcon className={`w-5 h-5 ${typeColor}`} />
          <div>
              <h3 className="text-md font-medium text-textBase dark:text-textBaseDark">{category.name}</h3>
              <p className={`text-xs font-semibold ${typeColor}`}>{typeLabel}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(category)} aria-label="Editar Categoria" className="!p-1.5">
              <EditIcon className="w-4 h-4" />
              </Button>
              <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDelete(category.id)} 
                  aria-label="Excluir Categoria"
                  className="!p-1.5"
                  disabled={transactionCount > 0}
                  title={transactionCount > 0 ? "Não pode excluir categorias com transações associadas" : "Excluir categoria"}
              >
              <TrashIcon className={`w-4 h-4 ${transactionCount > 0 ? 'text-neutral/50 dark:text-neutralDark/50' : 'text-destructive dark:text-destructiveDark'}`} />
              </Button>
          </div>
          {transactionCount > 0 && (
              <p className="text-xs text-textMuted dark:text-textMutedDark text-right">Usada em {transactionCount} trans.</p>
          )}
        </div>
      </div>
      
      {/* Budget Info for Expense Categories */}
      {category.type === TransactionType.EXPENSE && category.monthlyBudget && category.monthlyBudget > 0 && (
        <div className="mt-3 pt-2 border-t border-borderBase/20 dark:border-borderBaseDark/30">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-textMuted dark:text-textMutedDark">Orçamento Mensal: {formatCurrency(category.monthlyBudget)}</span>
            <span className={`font-medium ${isOverBudget ? 'text-destructive dark:text-destructiveDark' : 'text-secondary dark:text-secondaryDark'}`}>
              Gasto: {formatCurrency(monthlySpending)}
            </span>
          </div>
          <div className="w-full progress-bar-bg rounded-full h-2 dark:progress-bar-bg">
            <div 
              className={`h-2 rounded-full ${isOverBudget ? 'bg-destructive dark:bg-destructiveDark' : 'bg-primary dark:bg-primaryDark'}`}
              style={{ width: `${budgetProgress}%` }}
            ></div>
          </div>
           {isOverBudget && <p className="text-xs text-destructive dark:text-destructiveDark mt-1 text-right">Orçamento excedido!</p>}
        </div>
      )}
    </li>
  );
};

export default CategoryItem;