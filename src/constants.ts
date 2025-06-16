
import { Category, TransactionType, Account } from './types';
import { generateId } from './utils/helpers';

export const DEFAULT_INCOME_CATEGORIES_SEED: Omit<Category, 'id' | 'type'>[] = [
  { name: 'Salário' },
  { name: 'Vendas' },
  { name: 'Investimentos' },
  { name: 'Presente' },
  { name: 'Outras Receitas' },
];

export const DEFAULT_EXPENSE_CATEGORIES_SEED: Omit<Category, 'id' | 'type'>[] = [
  { name: 'Alimentação' },
  { name: 'Transporte' },
  { name: 'Moradia' },
  { name: 'Lazer' },
  { name: 'Saúde' },
  { name: 'Educação' },
  { name: 'Compras' },
  { name: 'Impostos' },
  { name: 'Outras Despesas' },
];

export const DEFAULT_ACCOUNTS_SEED: Omit<Account, 'id'>[] = [
  { name: 'Carteira', initialBalance: 0 },
  { name: 'Banco Principal', initialBalance: 1000 },
];

export const APP_NAME = "Meu Financeiro";

export const TRANSACTION_TYPE_OPTIONS = [
  { value: TransactionType.INCOME, label: 'Receita' },
  { value: TransactionType.EXPENSE, label: 'Despesa' },
  { value: TransactionType.TRANSFER, label: 'Transferência' },
];

export const PERIOD_FILTER_OPTIONS = [
  { value: 'all', label: 'Todo o Período' },
  { value: 'today', label: 'Hoje' },
  { value: 'current_month', label: 'Este Mês' },
  { value: 'last_7_days', label: 'Últimos 7 Dias' },
  { value: 'last_30_days', label: 'Últimos 30 Dias' },
  // { value: 'custom', label: 'Personalizado' }, // Custom range can be complex, omitting for simplicity
];

export const getInitialCategories = (): Category[] => {
  const income = DEFAULT_INCOME_CATEGORIES_SEED.map(cat => ({ ...cat, id: generateId(), type: TransactionType.INCOME as TransactionType.INCOME }));
  const expense = DEFAULT_EXPENSE_CATEGORIES_SEED.map(cat => ({ ...cat, id: generateId(), type: TransactionType.EXPENSE as TransactionType.EXPENSE }));
  return [...income, ...expense];
};

export const getInitialAccounts = (): Account[] => {
  return DEFAULT_ACCOUNTS_SEED.map(acc => ({ ...acc, id: generateId() }));
};