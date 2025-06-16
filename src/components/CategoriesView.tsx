import React from 'react'; 
import { useState, ChangeEvent }from 'react'; 
import { Category, TransactionType, Transaction, AIConfig } from '../types'; // Added AIConfig
import { generateId } from '../utils/helpers';
import CategoryItem from './CategoryItem';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import LightBulbIcon from './icons/LightBulbIcon'; // For suggest budget button

interface CategoriesViewProps {
  categories: Category[];
  transactions: Transaction[];
  aiConfig: AIConfig; // New: To check for income and pass to modal
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onSuggestBudget: (categoryName: string, currentBudgets: {name: string, budget?: number}[]) => Promise<number | null>; // New
}

const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  transactions,
  aiConfig, // New
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSuggestBudget, // New
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<TransactionType.INCOME | TransactionType.EXPENSE>(TransactionType.EXPENSE);
  const [monthlyBudget, setMonthlyBudget] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [isSuggestingBudget, setIsSuggestingBudget] = useState(false);


  const openModalForNew = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryType(TransactionType.EXPENSE);
    setMonthlyBudget('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryType(category.type);
    setMonthlyBudget(category.monthlyBudget?.toString() || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      setFormError('Nome da categoria é obrigatório.');
      return;
    }
    const budgetValue = monthlyBudget ? parseFloat(monthlyBudget) : undefined;
    if (categoryType === TransactionType.EXPENSE && monthlyBudget && (isNaN(budgetValue as any) || (budgetValue as any) < 0)) {
        setFormError('Orçamento mensal deve ser um número positivo ou vazio.');
        return;
    }
    setFormError('');

    const categoryData: Category = {
        id: editingCategory?.id || generateId(),
        name: categoryName.trim(),
        type: categoryType,
        monthlyBudget: categoryType === TransactionType.EXPENSE ? budgetValue : undefined,
    };

    if (editingCategory) {
      onUpdateCategory(categoryData);
    } else {
      onAddCategory(categoryData);
    }
    closeModal();
  };
  
  const getTransactionCountForCategory = (categoryId: string): number => {
    return transactions.filter(t => t.categoryId === categoryId).length;
  };

  const handleSuggestBudgetClick = async () => {
    if (!categoryName.trim() && !editingCategory) {
        setFormError("Por favor, insira um nome para a categoria antes de sugerir um orçamento.");
        return;
    }
    setFormError('');
    setIsSuggestingBudget(true);
    const currentBudgetsForSuggestion = categories
        .filter(c => c.type === TransactionType.EXPENSE && c.id !== editingCategory?.id && c.monthlyBudget)
        .map(c => ({ name: c.name, budget: c.monthlyBudget }));

    const suggested = await onSuggestBudget(editingCategory?.name || categoryName, currentBudgetsForSuggestion);
    if (suggested !== null) {
        setMonthlyBudget(suggested.toString());
    } else {
        setFormError("Não foi possível sugerir um orçamento no momento.");
    }
    setIsSuggestingBudget(false);
  };

  const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME).sort((a,b) => a.name.localeCompare(b.name));
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Categorias</h1>
        <Button onClick={openModalForNew} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Receitas ({incomeCategories.length})</h2>
          {incomeCategories.length > 0 ? (
            <ul className="space-y-3">
              {incomeCategories.map(category => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  transactions={transactions}
                  onEdit={openModalForEdit}
                  onDelete={onDeleteCategory}
                  transactionCount={getTransactionCountForCategory(category.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-textMuted dark:text-textMutedDark py-4">Nenhuma categoria de receita.</p>
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Despesas ({expenseCategories.length})</h2>
          {expenseCategories.length > 0 ? (
            <ul className="space-y-3">
              {expenseCategories.map(category => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  transactions={transactions}
                  onEdit={openModalForEdit}
                  onDelete={onDeleteCategory}
                  transactionCount={getTransactionCountForCategory(category.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-textMuted dark:text-textMutedDark py-4">Nenhuma categoria de despesa.</p>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}>
        <div className="space-y-4">
          <Input
            label="Nome da Categoria"
            id="categoryName"
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Ex: Alimentação, Salário"
            required
          />
          <Select
            label="Tipo de Categoria"
            id="categoryType"
            options={[
              { value: TransactionType.INCOME, label: 'Receita' },
              { value: TransactionType.EXPENSE, label: 'Despesa' },
            ]}
            value={categoryType}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setCategoryType(e.target.value as TransactionType.INCOME | TransactionType.EXPENSE);
                if (e.target.value === TransactionType.INCOME) setMonthlyBudget('');
            }}
            required
          />
          
          {categoryType === TransactionType.EXPENSE && (
            <div className="space-y-1">
                <Input
                    label="Orçamento Mensal (Opcional)"
                    id="monthlyBudget"
                    type="number"
                    step="0.01"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="Ex: 500.00"
                />
                {aiConfig.isEnabled && aiConfig.apiKeyStatus === 'available' && aiConfig.monthlyIncome && aiConfig.monthlyIncome > 0 && (
                     <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleSuggestBudgetClick}
                        disabled={isSuggestingBudget}
                        className="text-primary dark:text-primaryDark !mt-1.5"
                    >
                        <LightBulbIcon className="w-4 h-4 mr-1.5" />
                        {isSuggestingBudget ? "Sugerindo..." : "Sugerir com IA"}
                    </Button>
                )}
            </div>
          )}

          {formError && <p className="text-sm text-destructive dark:text-destructiveDark/90">{formError}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveCategory}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoriesView;