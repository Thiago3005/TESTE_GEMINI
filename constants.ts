
import { Category, TransactionType, Account } from './types';
import { generateId } from './utils/helpers';

export const DEFAULT_INCOME_CATEGORIES_SEED: Omit<Category, 'id' | 'type' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Salário' },
  { name: 'Vendas' },
  { name: 'Investimentos' },
  { name: 'Presente' },
  { name: 'Outras Receitas' },
];

export const DEFAULT_EXPENSE_CATEGORIES_SEED: Omit<Category, 'id' | 'type' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Alimentação' },
  { name: 'Transporte' },
  { name: 'Moradia' },
  { name: 'Lazer' },
  { name: 'Saúde' },
  { name: 'Educação' },
  { name: 'Compras' },
  { name: 'Impostos' },
  { name: 'Água' },
  { name: 'Luz' },
  { name: 'Pagamento de Fatura' },
  { name: 'Outras Despesas' },
];

export const DEFAULT_ACCOUNTS_SEED: Omit<Account, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Carteira', initial_balance: 0 },
  { name: 'Banco Principal', initial_balance: 1000 },
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

export const getInitialCategories = (userId: string, profileId: string): Omit<Category, 'id' | 'created_at' | 'updated_at'>[] => {
  const income = DEFAULT_INCOME_CATEGORIES_SEED.map(cat => ({ ...cat, user_id: userId, profile_id: profileId, type: TransactionType.INCOME as TransactionType.INCOME }));
  const expense = DEFAULT_EXPENSE_CATEGORIES_SEED.map(cat => ({ ...cat, user_id: userId, profile_id: profileId, type: TransactionType.EXPENSE as TransactionType.EXPENSE }));
  return [...income, ...expense];
};

export const getInitialAccounts = (userId: string, profileId: string): Omit<Account, 'id' | 'created_at' | 'updated_at'>[] => {
  return DEFAULT_ACCOUNTS_SEED.map(acc => ({ ...acc, user_id: userId, profile_id: profileId }));
};
