export interface Transaction {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  category_id: string;
  account_id: string;
  tag_ids?: string[];
  recurring_transaction_id?: string;
  loan_id?: string;
  money_box_id?: string;
}

export interface Account {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  balance: number;
  type: 'checking' | 'savings' | 'credit_card' | 'investment';
  color: string;
}

export interface Category {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

export interface Tag {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  color: string;
}

export interface MoneyBox {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  description?: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  description: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  category_id: string;
  account_id: string;
  tag_ids?: string[];
  is_active: boolean;
}

export interface Loan {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  amount: number;
  interest_rate: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'paid' | 'defaulted';
  account_id: string;
  category_id: string;
}

export interface LoanRepayment {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  loan_id: string;
  amount: number;
  date: string;
  linked_income_transaction_id?: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profile_id: string;
  theme: 'light' | 'dark';
  currency: string;
  language: string;
  ai_monthly_income: number | null | undefined;
} 