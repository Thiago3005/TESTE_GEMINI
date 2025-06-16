export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Always positive
  categoryId?: string; 
  description?: string;
  date: string; // YYYY-MM-DD
  accountId: string; 
  toAccountId?: string; // For TRANSFER type
  tagIds?: string[]; 
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType.INCOME | TransactionType.EXPENSE; 
  monthlyBudget?: number; 
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number; 
  dueDay: number; 
}

export interface InstallmentPurchase {
  id: string;
  creditCardId: string;
  description: string;
  purchaseDate: string; // YYYY-MM-DD
  totalAmount: number;
  numberOfInstallments: number;
  installmentsPaid: number; 
}

export interface MoneyBox {
  id: string;
  name: string;
  goalAmount?: number;
  createdAt: string; // YYYY-MM-DD
  icon?: string; 
  color?: string; 
}

export enum MoneyBoxTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

export interface MoneyBoxTransaction {
  id: string;
  moneyBoxId: string;
  type: MoneyBoxTransactionType;
  amount: number; 
  date: string; // YYYY-MM-DD
  description?: string;
  linkedAccountId?: string; 
  linkedTransactionId?: string; 
}

export interface Tag {
  id: string;
  name: string;
  color?: string; 
}

export type RecurringTransactionFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_days';

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType; 
  categoryId?: string; 
  accountId: string;
  toAccountId?: string; 
  frequency: RecurringTransactionFrequency;
  customIntervalDays?: number; 
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, optional
  occurrences?: number; 
  remainingOccurrences?: number; 
  nextDueDate: string; // YYYY-MM-DD, calculated
  lastPostedDate?: string; // YYYY-MM-DD
  isPaused?: boolean; 
  notes?: string;
}

export interface LoanRepayment {
  id: string;
  loanId: string; 
  repaymentDate: string; // YYYY-MM-DD
  amountPaid: number;
  notes?: string;
  creditedAccountId: string; 
  linkedIncomeTransactionId: string; 
}

export type LoanStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

export interface Loan {
  id: string;
  personName: string;
  description?: string;
  loanDate: string; // YYYY-MM-DD
  totalAmountToReimburse: number; 

  fundingSource: 'account' | 'creditCard';

  amountDeliveredFromAccount?: number; 
  linkedAccountId?: string; 
  linkedExpenseTransactionId?: string; 

  amountDeliveredFromCredit?: number; 
  costOnCreditCard?: number; 
  linkedCreditCardId?: string; 
  linkedInstallmentPurchaseId?: string; 

  repaymentIds: string[]; 
}

// AI Coach Types
export interface AIConfig {
  isEnabled: boolean;
  apiKeyStatus: 'unknown' | 'available' | 'unavailable' | 'error'; // unknown initially, then checked
  monthlyIncome?: number | null; 
  autoBackupToFileEnabled?: boolean; // New: For automatic backup to file
}

export type AIInsightType = 
  | 'general_advice' 
  | 'transaction_comment' 
  | 'budget_warning' 
  | 'spending_suggestion'
  | 'budget_recommendation' 
  | 'goal_update'
  | 'future_purchase_advice' // New type for future purchase analysis
  | 'error_message';

export interface AIInsight {
  id: string;
  timestamp: string; // ISO string
  type: AIInsightType;
  content: string; // The AI-generated text
  relatedTransactionId?: string;
  relatedMoneyBoxId?: string;
  relatedCategoryId?: string;
  relatedFuturePurchaseId?: string; // New: link to future purchase
  isRead: boolean;
  isLoading?: boolean; // For optimistic UI updates
}

// Profile Type
export interface UserProfile {
  id: string;
  name: string;
}

// Future Purchases Types
export type FuturePurchaseStatus = 
  | 'PLANNED' 
  | 'CONSIDERING' 
  | 'ACHIEVABLE_SOON' 
  | 'NOT_RECOMMENDED_NOW' 
  | 'AI_ANALYZING';

export type FuturePurchasePriority = 'low' | 'medium' | 'high';

export interface FuturePurchase {
  id: string;
  name: string;
  estimatedCost: number;
  priority: FuturePurchasePriority;
  notes?: string;
  status: FuturePurchaseStatus;
  createdAt: string; // YYYY-MM-DD
  aiAnalysis?: string; // Stores the AI's textual analysis
  aiAnalyzedAt?: string; // Timestamp of last AI analysis
}


export type AppView = 
  | 'PROFILE_SELECTION'
  | 'DASHBOARD' 
  | 'TRANSACTIONS' 
  | 'ACCOUNTS' 
  | 'CATEGORIES' 
  | 'CREDIT_CARDS' 
  | 'MONEY_BOXES'
  | 'FUTURE_PURCHASES' // New view
  | 'TAGS' 
  | 'RECURRING_TRANSACTIONS'
  | 'LOANS'
  | 'AI_COACH' 
  | 'DATA_MANAGEMENT';

export interface ChartData {
  name: string; // For X-axis label (e.g., category name, day)
  value: number; // For Y-axis value or pie slice value
}

export type Theme = 'light' | 'dark' | 'system';