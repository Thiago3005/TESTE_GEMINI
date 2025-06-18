
import React from 'react';
import { useState, useEffect, useCallback, useMemo }from 'react';
import { supabase } from './services/supabaseClient';
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

import {
  Transaction, Account, Category, TransactionType, AppView, CreditCard, InstallmentPurchase,
  MoneyBox, MoneyBoxTransaction, MoneyBoxTransactionType, Theme, UserPreferences,
  Tag, RecurringTransaction, RecurringTransactionFrequency,
  Loan, LoanRepayment, LoanStatus,
  AIConfig, AIInsight, AIInsightType,
  FuturePurchase, FuturePurchaseStatus, FuturePurchasePriority, ToastType, UserProfile,
  Debt, DebtPayment // Added Debt types
} from './types';
import { APP_NAME, getInitialCategories as getSeedCategories, getInitialAccounts as getSeedAccounts } from './constants';
import { generateId as generateClientSideId, getISODateString, formatDate, formatCurrency, getEligibleInstallmentsForBillingCycle } from './utils/helpers';


import { ToastProvider, useToasts } from './contexts/ToastContext';

// Views
import DashboardView from './components/DashboardView';
import TransactionsView from './components/TransactionsView';
import AccountsView from './components/AccountsView';
import CategoriesView from './components/CategoriesView';
import CreditCardsView from './components/CreditCardsView';
import MoneyBoxesView from './components/MoneyBoxesView';
import FuturePurchasesView from './components/FuturePurchasesView';
import DataManagementView from './components/DataManagementView';
import TagsView from './components/TagsView';
import RecurringTransactionsView from './components/RecurringTransactionsView';
import LoansView from './components/LoansView';
import AICoachView from './components/AICoachView';
import LoginView from './components/LoginView';
import DebtPlannerView from './components/DebtPlannerView'; // New View


// Components
import Modal from './components/Modal';
import TransactionForm from './components/TransactionForm';
import ThemeSwitcher from './components/ThemeSwitcher';
import Button from './components/Button';

// Icons
import ChartPieIcon from './components/icons/ChartPieIcon';
import ListBulletIcon from './components/icons/ListBulletIcon';
import CreditCardIcon from './components/icons/CreditCardIcon';
import TagIcon from './components/icons/TagIcon';
import CogIcon from './components/icons/CogIcon';
import PlusIcon from './components/icons/PlusIcon';
import PiggyBankIcon from './components/icons/PiggyBankIcon';
import ShoppingCartIcon from './components/icons/ShoppingCartIcon';
import BookmarkSquareIcon from './components/icons/BookmarkSquareIcon';
import ArrowPathIcon from './components/icons/ArrowPathIcon';
import UsersIcon from './components/icons/UsersIcon';
import ChatBubbleLeftRightIcon from './components/icons/ChatBubbleLeftRightIcon';
import UserCircleIcon from './components/icons/UserCircleIcon';
import EyeIcon from './components/icons/EyeIcon';
import EyeSlashIcon from './components/icons/EyeSlashIcon';
import PowerIcon from './components/icons/PowerIcon';
import BanknotesIcon from './components/icons/BanknotesIcon'; // New Icon

// Services
import * as geminiService from './services/geminiService';
import type { FinancialContext, SimulatedTransactionData } from './services/geminiService';


const AppContent: React.FC = () => {
  const { addToast } = useToasts();

  // Auth State
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // User Preferences State (synced with Supabase)
  const [theme, setThemeState] = useState<Theme>('system');
  const [isPrivacyModeEnabled, setIsPrivacyModeEnabledState] = useState(false);
  const [aiConfig, setAiConfigState] = useState<AIConfig>({
    isEnabled: false,
    apiKeyStatus: 'unknown',
    monthlyIncome: null,
    autoBackupToFileEnabled: false,
  });

  // Data States (all fetched from Supabase)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [installmentPurchases, setInstallmentPurchases] = useState<InstallmentPurchase[]>([]);
  const [moneyBoxes, setMoneyBoxes] = useState<MoneyBox[]>([]);
  const [moneyBoxTransactions, setMoneyBoxTransactions] = useState<MoneyBoxTransaction[]>([]);
  const [futurePurchases, setFuturePurchases] = useState<FuturePurchase[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanRepayments, setLoanRepayments] = useState<LoanRepayment[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]); // New state for Debts
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]); // New state for DebtPayments


  // Loading states for data
  const [isLoadingData, setIsLoadingData] = useState(true); 

  const [activeView, setActiveView] = useState<AppView>('DASHBOARD');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const activeUserDisplayName = useMemo(() => {
    return user?.user_metadata?.full_name || user?.email || "Usuário";
  }, [user]);

  // --- Auth Effects and Functions ---
  useEffect(() => {
    setIsLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoadingSession(false);
        if (_event === 'SIGNED_OUT') {
            setActiveView('LOGIN');
            setTransactions([]); setAccounts([]); setCategories([]); setCreditCards([]);
            setInstallmentPurchases([]); setMoneyBoxes([]); setMoneyBoxTransactions([]);
            setFuturePurchases([]); setTags([]); setRecurringTransactions([]);
            setLoans([]); setLoanRepayments([]); setAiInsights([]);
            setDebts([]); setDebtPayments([]); // Clear debt data on sign out
            setThemeState('system'); setIsPrivacyModeEnabledState(false);
            setAiConfigState({ isEnabled: false, apiKeyStatus: 'unknown', monthlyIncome: null, autoBackupToFileEnabled: false });
            addToast("Você foi desconectado.", 'info');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [addToast]);

  const fetchAndSetAllUserData = useCallback(async (userId: string) => {
    setIsLoadingData(true);
    try {
        const { data: prefsData, error: prefsError } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (prefsError && prefsError.code !== 'PGRST116') throw prefsError;
        
        if (prefsData) {
            setThemeState(prefsData.theme);
            setIsPrivacyModeEnabledState(prefsData.is_privacy_mode_enabled);
            setAiConfigState({
                isEnabled: prefsData.ai_is_enabled,
                monthlyIncome: prefsData.ai_monthly_income,
                autoBackupToFileEnabled: prefsData.ai_auto_backup_enabled,
                apiKeyStatus: geminiService.isGeminiApiKeyAvailable() ? 'available' : 'unavailable',
            });
        } else {
            const defaultPrefs: Omit<UserPreferences, 'user_id' | 'updated_at' | 'created_at'> = {
                theme: 'system', is_privacy_mode_enabled: false,
                ai_is_enabled: false, ai_monthly_income: null, ai_auto_backup_enabled: false,
            };
            const { error: insertPrefsError } = await supabase
                .from('user_preferences')
                .insert({ user_id: userId, ...defaultPrefs });
            if (insertPrefsError) throw insertPrefsError;
            setThemeState(defaultPrefs.theme);
            setIsPrivacyModeEnabledState(defaultPrefs.is_privacy_mode_enabled);
            setAiConfigState({
                isEnabled: defaultPrefs.ai_is_enabled,
                monthlyIncome: defaultPrefs.ai_monthly_income,
                autoBackupToFileEnabled: defaultPrefs.ai_auto_backup_enabled,
                apiKeyStatus: geminiService.isGeminiApiKeyAvailable() ? 'available' : 'unavailable',
            });
        }

        const [
            transactionsRes, accountsRes, categoriesRes, creditCardsRes, installmentPurchasesRes,
            moneyBoxesRes, moneyBoxTransactionsRes, futurePurchasesRes, tagsRes,
            recurringTransactionsRes, loansRes, loanRepaymentsRes, aiInsightsRes,
            debtsRes, debtPaymentsRes // Fetch debt data
        ] = await Promise.all([
            supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
            supabase.from('accounts').select('*').eq('user_id', userId).order('name'),
            supabase.from('categories').select('*').eq('user_id', userId).order('name'),
            supabase.from('credit_cards').select('*').eq('user_id', userId).order('name'),
            supabase.from('installment_purchases').select('*').eq('user_id', userId).order('purchase_date', { ascending: false }),
            supabase.from('money_boxes').select('*').eq('user_id', userId).order('name'),
            supabase.from('money_box_transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
            supabase.from('future_purchases').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('tags').select('*').eq('user_id', userId).order('name'),
            supabase.from('recurring_transactions').select('*').eq('user_id', userId).order('next_due_date'),
            supabase.from('loans').select('*').eq('user_id', userId).order('loan_date', { ascending: false }),
            supabase.from('loan_repayments').select('*').eq('user_id', userId).order('repayment_date', { ascending: false }),
            supabase.from('ai_insights').select('*').eq('user_id', userId).order('timestamp', { ascending: false }),
            supabase.from('debts').select('*').eq('user_id', userId).order('created_at', { ascending: false }), // Added
            supabase.from('debt_payments').select('*').eq('user_id', userId).order('payment_date', { ascending: false }), // Added
        ]);

        if (transactionsRes.error) throw transactionsRes.error; setTransactions(transactionsRes.data as Transaction[]);
        if (accountsRes.error) throw accountsRes.error; setAccounts(accountsRes.data as Account[]);
        if (categoriesRes.error) throw categoriesRes.error; setCategories(categoriesRes.data as Category[]);
        if (creditCardsRes.error) throw creditCardsRes.error; setCreditCards(creditCardsRes.data as CreditCard[]);
        if (installmentPurchasesRes.error) throw installmentPurchasesRes.error; setInstallmentPurchases(installmentPurchasesRes.data as InstallmentPurchase[]);
        if (moneyBoxesRes.error) throw moneyBoxesRes.error; setMoneyBoxes(moneyBoxesRes.data as MoneyBox[]);
        if (moneyBoxTransactionsRes.error) throw moneyBoxTransactionsRes.error; setMoneyBoxTransactions(moneyBoxTransactionsRes.data as MoneyBoxTransaction[]);
        if (futurePurchasesRes.error) throw futurePurchasesRes.error; setFuturePurchases(futurePurchasesRes.data as FuturePurchase[]);
        if (tagsRes.error) throw tagsRes.error; setTags(tagsRes.data as Tag[]);
        if (recurringTransactionsRes.error) throw recurringTransactionsRes.error; setRecurringTransactions(recurringTransactionsRes.data as RecurringTransaction[]);
        if (loansRes.error) throw loansRes.error; setLoans(loansRes.data as Loan[]);
        if (loanRepaymentsRes.error) throw loanRepaymentsRes.error; setLoanRepayments(loanRepaymentsRes.data as LoanRepayment[]);
        if (aiInsightsRes.error) throw aiInsightsRes.error; setAiInsights(aiInsightsRes.data as AIInsight[]);
        if (debtsRes.error) throw debtsRes.error; setDebts(debtsRes.data as Debt[]); // Added
        if (debtPaymentsRes.error) throw debtPaymentsRes.error; setDebtPayments(debtPaymentsRes.data as DebtPayment[]); // Added
        
        if (accountsRes.data?.length === 0) {
            const seedAccs = getSeedAccounts(userId).map(acc => ({ ...acc, user_id: userId })); 
            const { data: newAccs, error: seedAccError } = await supabase.from('accounts').insert(seedAccs).select();
            if (seedAccError) throw seedAccError;
            if (newAccs) setAccounts(newAccs as Account[]);
        }
        if (categoriesRes.data?.length === 0) {
            const seedCats = getSeedCategories(userId).map(cat => ({ ...cat, user_id: userId })); 
            const { data: newCats, error: seedCatError } = await supabase.from('categories').insert(seedCats).select();
            if (seedCatError) throw seedCatError;
            if (newCats) setCategories(newCats as Category[]);
        }
        setActiveView('DASHBOARD');

    } catch (error: any) {
        console.error("Error fetching user data:", error);
        addToast(`Erro ao carregar dados: ${error.message}`, 'error');
    } finally {
        setIsLoadingData(false);
    }
  }, [addToast]);


  useEffect(() => {
    if (user && !isLoadingSession) {
        fetchAndSetAllUserData(user.id);
    } else if (!user && !isLoadingSession) {
        setActiveView('LOGIN');
        setIsLoadingData(false);
    }
  }, [user, isLoadingSession, fetchAndSetAllUserData]);


  const updateUserPreference = useCallback(async (userId: string,  key: keyof Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>, value: any) => {
      const { error } = await supabase
        .from('user_preferences')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) {
        console.error(`Error updating user preference ${key}:`, error);
        addToast(`Erro ao salvar preferência (${key}): ${error.message}`, 'error');
      }
  }, [addToast]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (user) updateUserPreference(user.id, 'theme', newTheme);
  }, [user, updateUserPreference]);

  const togglePrivacyMode = useCallback(() => {
    const newPrivacyModeState = !isPrivacyModeEnabled;
    setIsPrivacyModeEnabledState(newPrivacyModeState);
    if (user) updateUserPreference(user.id, 'is_privacy_mode_enabled', newPrivacyModeState);
  }, [isPrivacyModeEnabled, user, updateUserPreference]);

  const updateAiConfig = useCallback((newConfig: Partial<Omit<AIConfig, 'apiKeyStatus'>>) => {
    const updatedConfigFields: Partial<Pick<UserPreferences, 'ai_is_enabled' | 'ai_monthly_income' | 'ai_auto_backup_enabled'>> = {};
    if (newConfig.isEnabled !== undefined) updatedConfigFields.ai_is_enabled = newConfig.isEnabled;
    if (newConfig.monthlyIncome !== undefined) updatedConfigFields.ai_monthly_income = newConfig.monthlyIncome;
    if (newConfig.autoBackupToFileEnabled !== undefined) updatedConfigFields.ai_auto_backup_enabled = newConfig.autoBackupToFileEnabled;

    setAiConfigState(prev => ({...prev, ...newConfig}));

    if (user && Object.keys(updatedConfigFields).length > 0) {
         supabase.from('user_preferences')
            .update({...updatedConfigFields, updated_at: new Date().toISOString()})
            .eq('user_id', user.id)
            .then(({ error }) => {
                 if (error) {
                    console.error('Error updating AI config in preferences:', error);
                    addToast(`Erro ao salvar configurações da IA: ${error.message}`, 'error');
                }
            });
    }
  }, [user, addToast]);


  useEffect(() => {
    const applyThemeToDocument = (currentTheme: Theme) => {
      if (currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyThemeToDocument(theme);
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyThemeToDocument('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const handleSignInWithGoogle = async () => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://thiago3005.github.io/controle-financeiro/', 
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      setAuthError(error.message || "Falha ao fazer login com Google.");
      addToast(error.message || "Falha ao fazer login com Google.", 'error');
    }
  };
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error("Error signing out:", error);
      addToast(error.message || "Falha ao sair.", 'error');
    }
  };

  const calculateAccountBalance = useCallback((accountId: string): number => {
    if (!user) return 0;
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return 0;

    return transactions.reduce((balance, transaction) => {
        if (transaction.account_id === accountId) {
        if (transaction.type === TransactionType.INCOME) return balance + transaction.amount;
        if (transaction.type === TransactionType.EXPENSE) return balance - transaction.amount;
        if (transaction.type === TransactionType.TRANSFER) return balance - transaction.amount; 
        } else if (transaction.to_account_id === accountId && transaction.type === TransactionType.TRANSFER) {
        return balance + transaction.amount; 
        }
        return balance;
    }, account.initial_balance);
  }, [accounts, transactions, user]);

  const calculateMoneyBoxBalance = useCallback((moneyBoxId: string): number => {
    if (!user) return 0;
    return moneyBoxTransactions.reduce((balance, mbt) => {
      if (mbt.money_box_id === moneyBoxId) {
        if (mbt.type === MoneyBoxTransactionType.DEPOSIT) return balance + mbt.amount;
        if (mbt.type === MoneyBoxTransactionType.WITHDRAWAL) return balance - mbt.amount;
      }
      return balance;
    }, 0);
  }, [moneyBoxTransactions, user]);

  const generateFinancialContext = useCallback((simulatedTx?: SimulatedTransactionData): FinancialContext | null => {
    if (!user) return null;
    const currentDateObj = new Date();
    const currentDate = getISODateString(currentDateObj);
    const dayOfMonth = currentDateObj.getDate();
    const currentYear = currentDateObj.getFullYear();
    const currentMonth = currentDateObj.getMonth(); 
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let effectiveTransactions = [...transactions];
    if (simulatedTx) {
        // Create a temporary full transaction object for the simulation
        const tempSimulatedTx: Transaction = {
            id: `simulated-${generateClientSideId()}`, // Temporary ID
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            type: simulatedTx.type,
            amount: simulatedTx.amount,
            date: simulatedTx.date,
            description: simulatedTx.description,
            account_id: 'simulated_account', // Placeholder, AI will know it's a general impact
        };
        effectiveTransactions.push(tempSimulatedTx);
    }


    const getAppliedTheme = (): 'light' | 'dark' => {
      if (theme === 'system') {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme; 
    };
    return {
        currentDate,
        dayOfMonth,
        daysInMonth,
        accounts: accounts.map(a => ({ id: a.id, name: a.name })),
        accountBalances: accounts.map(a => ({ accountId: a.id, balance: calculateAccountBalance(a.id) })),
        categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type, monthly_budget: c.monthly_budget })),
        transactions: effectiveTransactions, 
        moneyBoxes: moneyBoxes.map(mb => ({ id: mb.id, name: mb.name, goal_amount: mb.goal_amount })),
        moneyBoxBalances: moneyBoxes.map(mb => ({ moneyBoxId: mb.id, balance: calculateMoneyBoxBalance(mb.id) })),
        loans: loans.map(l => ({ id: l.id, person_name: l.person_name, total_amount_to_reimburse: l.total_amount_to_reimburse })),
        outstandingLoanBalances: loans.map(l => {
            const paid = loanRepayments.filter(rp => rp.loan_id === l.id).reduce((sum, rp) => sum + rp.amount_paid, 0);
            return { loanId: l.id, outstanding: l.total_amount_to_reimburse - paid };
        }),
        recurringTransactions: recurringTransactions.map(rt => ({id: rt.id, description: rt.description, amount: rt.amount, type: rt.type, next_due_date: rt.next_due_date, frequency: rt.frequency, category_id: rt.category_id })),
        futurePurchases: futurePurchases.map(fp => ({id: fp.id, name: fp.name, estimated_cost: fp.estimated_cost, priority: fp.priority, status: fp.status })),
        theme: getAppliedTheme(),
        monthlyIncome: aiConfig.monthlyIncome,
        simulatedTransactionData: simulatedTx, // Pass simulated transaction data separately for explicit handling in prompt
    };
  }, [user, accounts, transactions, categories, moneyBoxes, moneyBoxTransactions, loans, loanRepayments, recurringTransactions, futurePurchases, theme, aiConfig.monthlyIncome, calculateAccountBalance, calculateMoneyBoxBalance]);

  const handleAddAIInsight = async (insight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('ai_insights').insert({ ...insight, user_id: user.id }).select().single();
    if (error) { addToast(`Erro ao salvar insight: ${error.message}`, 'error'); }
    else if (data) { setAiInsights(prev => [data as AIInsight, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())); }
  };

  const handleFetchGeneralAIAdvice = useCallback(async () => {
    if (!user || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;

    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'> = {
      timestamp: new Date().toISOString(), type: 'general_advice', content: "Buscando novo conselho...", is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId(); 
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, created_at: '', updated_at: ''}, ...prev]);

    const advice = await geminiService.fetchGeneralAdvice(context);
    
    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId)); 
    if (advice) handleAddAIInsight(advice as Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'>); 
    
  }, [user, aiConfig.isEnabled, aiConfig.apiKeyStatus, generateFinancialContext, handleAddAIInsight]);

  const handleGenerateCommentForTransaction = useCallback(async (transaction: Transaction) => {
    if (!user || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;

     const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'> = {
        timestamp: new Date().toISOString(), type: 'transaction_comment',
        content: `Analisando transação: ${transaction.description || transaction.type}...`,
        related_transaction_id: transaction.id, is_read: false, isLoading: true,
      };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, created_at: '', updated_at: ''}, ...prev]);
    
    const categoryName = transaction.category_id ? categories.find(c => c.id === transaction.category_id)?.name : undefined;
    const accountName = accounts.find(a => a.id === transaction.account_id)?.name || creditCards.find(cc => cc.id === transaction.account_id)?.name;
    const comment = await geminiService.fetchCommentForTransaction(transaction, context, categoryName, accountName);

    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (comment) handleAddAIInsight(comment as Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'>);
  }, [user, aiConfig.isEnabled, aiConfig.apiKeyStatus, categories, accounts, creditCards, generateFinancialContext, handleAddAIInsight]);

  const handleAnalyzeSpendingForCategory = useCallback(async (transaction: Transaction) => {
    if (!user || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available' || transaction.type !== TransactionType.EXPENSE || !transaction.category_id) {
        return;
    }
    const context = generateFinancialContext();
    if (!context) return;

    const category = categories.find(c => c.id === transaction.category_id);
    if (!category) return;

    const currentMonthStr = transaction.date.substring(0, 7);
    const currentMonthTransactions = transactions.filter(t => t.category_id === category.id && t.date.startsWith(currentMonthStr) && t.type === TransactionType.EXPENSE);
    const currentSpendInCat = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    if (category.monthly_budget && category.monthly_budget > 0) {
        const proRataBudget = (category.monthly_budget / context.daysInMonth) * context.dayOfMonth;
        if (currentSpendInCat > proRataBudget * 1.20) { 
            const anomalyInsight = await geminiService.fetchSpendingAnomalyInsight(category.name, currentSpendInCat, proRataBudget, category.monthly_budget, context, category.id);
            if (anomalyInsight) handleAddAIInsight(anomalyInsight);
        }
    }

    if (category.monthly_budget && category.monthly_budget > 0 && context.dayOfMonth > 0) {
        const projectedSpend = (currentSpendInCat / context.dayOfMonth) * context.daysInMonth;
        const daysRemaining = context.daysInMonth - context.dayOfMonth;
        if (projectedSpend > category.monthly_budget * 1.05) { 
            const projectionInsight = await geminiService.fetchBudgetOverspendProjectionInsight(category.name, currentSpendInCat, category.monthly_budget, daysRemaining, projectedSpend, context, category.id);
            if (projectionInsight) handleAddAIInsight(projectionInsight);
        }
    }

    const recentCategoryTransactions = transactions.filter(t => t.category_id === category.id && t.id !== transaction.id).slice(0, 20);
    if (recentCategoryTransactions.length > 5) { 
        const unusualInsight = await geminiService.fetchUnusualTransactionInsight(transaction, category.name, recentCategoryTransactions, context);
        if (unusualInsight) handleAddAIInsight(unusualInsight);
    }

  }, [user, aiConfig, categories, transactions, generateFinancialContext, handleAddAIInsight]);

  const handleFetchRecurringPaymentCandidates = useCallback(async () => {
    if (!user || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;

    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'> = {
        timestamp: new Date().toISOString(), type: 'recurring_payment_candidate',
        content: "Analisando possíveis despesas recorrentes não cadastradas...", is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, created_at: '', updated_at: ''}, ...prev]);
    
    const insight = await geminiService.fetchRecurringPaymentCandidateInsight(transactions, recurringTransactions, context);
    
    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (insight) handleAddAIInsight(insight);
    else addToast("Nenhuma nova despesa recorrente óbvia encontrada.", "info");
  }, [user, aiConfig, transactions, recurringTransactions, generateFinancialContext, handleAddAIInsight, addToast]);

  const handleFetchSavingOpportunities = useCallback(async () => {
    if (!user || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;

    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'> = {
        timestamp: new Date().toISOString(), type: 'saving_opportunity_suggestion',
        content: "Buscando oportunidades de economia...", is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, created_at: '', updated_at: ''}, ...prev]);

    const insight = await geminiService.fetchSavingOpportunityInsight(transactions, categories, moneyBoxes, context);

    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (insight) handleAddAIInsight(insight);
    else addToast("Nenhuma oportunidade clara de economia encontrada no momento.", "info");
  }, [user, aiConfig, transactions, categories, moneyBoxes, generateFinancialContext, handleAddAIInsight, addToast]);

  const handleFetchCashFlowProjection = useCallback(async (projectionPeriodDays: number = 30, simulatedTx?: SimulatedTransactionData) => {
    if (!user || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext(simulatedTx);
    if (!context) return;

    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'> = {
        timestamp: new Date().toISOString(), type: 'cash_flow_projection',
        content: `Gerando projeção de fluxo de caixa para os próximos ${projectionPeriodDays} dias${simulatedTx ? ' (com simulação)' : ''}...`, 
        is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, created_at: '', updated_at: ''}, ...prev]);

    const insight = await geminiService.fetchCashFlowProjectionInsight(context, projectionPeriodDays);
    
    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (insight) handleAddAIInsight(insight); 
  }, [user, aiConfig, generateFinancialContext, handleAddAIInsight]);


  const handleSuggestCategoryBudget = useCallback(async (categoryName: string, currentExpenseBudgets: {name: string, budget?: number}[]) => {
    if (!user || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available' || !aiConfig.monthlyIncome) { addToast("Renda mensal não informada ou IA desativada.", 'warning'); return null; }
    
    const context = generateFinancialContext();
    if (!context) return null;

    const relatedCat = categories.find(c=>c.name === categoryName && c.type === TransactionType.EXPENSE);
    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'> = {
        timestamp: new Date().toISOString(), type: 'budget_recommendation',
        content: `Calculando sugestão de orçamento para ${categoryName}...`, 
        related_category_id: relatedCat?.id, is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, created_at: '', updated_at: ''}, ...prev]);
    
    const result = await geminiService.fetchBudgetSuggestion(categoryName, aiConfig.monthlyIncome, currentExpenseBudgets, context);

    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (result && 'suggestedBudget' in result && typeof result.suggestedBudget === 'number') {
        const successInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'> = { 
            content: `Sugestão para ${categoryName}: ${formatCurrency(result.suggestedBudget)}`, 
            related_category_id: relatedCat?.id, 
            timestamp: new Date().toISOString(), type: 'budget_recommendation', is_read: false 
        };
        handleAddAIInsight(successInsight);
        return result.suggestedBudget;
    } else if (result && 'content' in result) { 
        handleAddAIInsight(result as Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'>);
    }
    return null;
  }, [user, aiConfig, categories, generateFinancialContext, addToast, handleAddAIInsight]);

  const handleAnalyzeFuturePurchase = useCallback(async (purchaseId: string) => {
    if (!user || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') { addToast("AI Coach desativado ou API Key indisponível.", 'warning'); return; }
    const purchase = futurePurchases.find(p => p.id === purchaseId);
    if (!purchase) return;
    
    const context = generateFinancialContext();
    if (!context) return;

    setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'AI_ANALYZING' } : p));
    const result = await geminiService.fetchFuturePurchaseAnalysis(purchase, context);

    if (result && 'analysisText' in result) {
        const { data, error } = await supabase.from('future_purchases')
            .update({ status: result.recommendedStatus, ai_analysis: result.analysisText, ai_analyzed_at: new Date().toISOString() })
            .eq('id', purchaseId).eq('user_id', user.id).select().single();
        
        if (error || !data) {
            addToast(`Erro ao atualizar compra futura: ${error?.message || 'Falha'}`, 'error');
            setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: purchase.status } : p)); 
        } else {
            setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? data as FuturePurchase : p));
            addToast(`Análise para "${purchase.name}" concluída!`, 'info');
        }
    } else if (result && 'content' in result) { 
        handleAddAIInsight(result as Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'>);
        setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: purchase.status } : p)); 
    }
  }, [user, aiConfig, futurePurchases, generateFinancialContext, addToast, handleAddAIInsight]);

  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const newTransactionSupabase: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> = { ...transactionData, user_id: user.id };
    
    const { data: newTransaction, error } = await supabase.from('transactions').insert(newTransactionSupabase).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); return; } 
    
    if (newTransaction) { 
        setTransactions(prev => [newTransaction as Transaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsTransactionModalOpen(false); 
        handleGenerateCommentForTransaction(newTransaction as Transaction);
        handleAnalyzeSpendingForCategory(newTransaction as Transaction); 
        addToast('Transação adicionada!', 'success');

        const isCreditCardSource = creditCards.some(cc => cc.id === newTransaction.account_id);
        if (isCreditCardSource && newTransaction.type === TransactionType.EXPENSE) {
            const installmentPurchaseData: Omit<InstallmentPurchase, 'id'|'user_id'|'created_at'|'updated_at'> = {
                credit_card_id: newTransaction.account_id,
                description: `Débito na Fatura: ${newTransaction.description || categories.find(c=>c.id === newTransaction.category_id)?.name || 'Despesa no Cartão'}`,
                purchase_date: newTransaction.date,
                total_amount: newTransaction.amount,
                number_of_installments: 1,
                installments_paid: 0,
                linked_transaction_id: newTransaction.id,
            };
            await handleAddInstallmentPurchase(installmentPurchaseData, false);
        }
    }
  };
  const handleUpdateTransaction = async (updatedTransactionData: Transaction) => {
    if (!user || !updatedTransactionData.id) return;

    const originalTransaction = transactions.find(t => t.id === updatedTransactionData.id);
    if (!originalTransaction) { addToast("Erro: Transação original não encontrada.", 'error'); return; }

    const { data: updatedTransaction, error } = await supabase
        .from('transactions')
        .update(updatedTransactionData)
        .eq('id', updatedTransactionData.id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) { addToast(`Erro ao atualizar transação: ${error.message}`, 'error'); return; }
    
    if (updatedTransaction) {
        setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction as Transaction : t).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsTransactionModalOpen(false); 
        setEditingTransaction(null);
        handleGenerateCommentForTransaction(updatedTransaction as Transaction);
        handleAnalyzeSpendingForCategory(updatedTransaction as Transaction); 
        addToast('Transação atualizada!', 'success');

        const oldIsCardExpense = creditCards.some(cc => cc.id === originalTransaction.account_id) && originalTransaction.type === TransactionType.EXPENSE;
        const newIsCardExpense = creditCards.some(cc => cc.id === updatedTransaction.account_id) && updatedTransaction.type === TransactionType.EXPENSE;
        const oldLinkedIp = installmentPurchases.find(ip => ip.linked_transaction_id === originalTransaction.id && ip.number_of_installments === 1);

        if (oldIsCardExpense && !newIsCardExpense && oldLinkedIp) {
            await handleDeleteInstallmentPurchase(oldLinkedIp.id, false);
        } else if (!oldIsCardExpense && newIsCardExpense) {
            const installmentPurchaseData: Omit<InstallmentPurchase, 'id'|'user_id'|'created_at'|'updated_at'> = {
                credit_card_id: updatedTransaction.account_id,
                description: `Débito na Fatura: ${updatedTransaction.description || categories.find(c=>c.id === updatedTransaction.category_id)?.name || 'Despesa no Cartão'}`,
                purchase_date: updatedTransaction.date,
                total_amount: updatedTransaction.amount,
                number_of_installments: 1, installments_paid: 0,
                linked_transaction_id: updatedTransaction.id,
            };
            await handleAddInstallmentPurchase(installmentPurchaseData, false);
        } else if (oldIsCardExpense && newIsCardExpense && oldLinkedIp) {
            if (originalTransaction.account_id !== updatedTransaction.account_id && oldLinkedIp) {
                 await handleDeleteInstallmentPurchase(oldLinkedIp.id, false);
                 const newIpData: Omit<InstallmentPurchase, 'id'|'user_id'|'created_at'|'updated_at'> = {
                    credit_card_id: updatedTransaction.account_id,
                    description: `Débito na Fatura: ${updatedTransaction.description || categories.find(c=>c.id === updatedTransaction.category_id)?.name || 'Despesa no Cartão'}`,
                    purchase_date: updatedTransaction.date, total_amount: updatedTransaction.amount,
                    number_of_installments: 1, installments_paid: 0, linked_transaction_id: updatedTransaction.id,
                };
                await handleAddInstallmentPurchase(newIpData, false);
            } else if (oldLinkedIp) {
                const updatedIpData: InstallmentPurchase = {
                    ...oldLinkedIp,
                    description: `Débito na Fatura: ${updatedTransaction.description || categories.find(c=>c.id === updatedTransaction.category_id)?.name || 'Despesa no Cartão'}`,
                    purchase_date: updatedTransaction.date,
                    total_amount: updatedTransaction.amount,
                };
                await handleUpdateInstallmentPurchase(updatedIpData, false);
            }
        }
    }
  };
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user) return;
    if (window.confirm('Excluir esta transação?')) {
       const linkedMbTx = moneyBoxTransactions.find(mbt => mbt.linked_transaction_id === transactionId);
       if (linkedMbTx) {
       }
        const linkedInstallmentPurchase = installmentPurchases.find(ip => ip.linked_transaction_id === transactionId && ip.number_of_installments === 1);
        if (linkedInstallmentPurchase) {
            await handleDeleteInstallmentPurchase(linkedInstallmentPurchase.id, false); 
        }

      const { error } = await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', user.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setTransactions(prev => prev.filter(t => t.id !== transactionId)); addToast('Transação excluída!', 'success'); }
    }
  };

  const handleAddAccount = async (account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('accounts').insert({ ...account, user_id: user.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setAccounts(prev => [...prev, data as Account].sort((a,b) => a.name.localeCompare(b.name))); addToast('Conta adicionada!', 'success');}
  };
  const handleUpdateAccount = async (updatedAccount: Account) => {
    if (!user) return;
    const { data, error } = await supabase.from('accounts').update(updatedAccount).eq('id', updatedAccount.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setAccounts(prev => prev.map(acc => acc.id === data.id ? data as Account : acc).sort((a,b) => a.name.localeCompare(b.name))); addToast('Conta atualizada!', 'success');}
  };
  const handleDeleteAccount = async (accountId: string) => {
    if (!user) return;
    if (transactions.some(t => t.account_id === accountId || t.to_account_id === accountId) ||
        recurringTransactions.some(rt => rt.account_id === accountId || rt.to_account_id === accountId) ||
        loans.some(l => l.linked_account_id === accountId || loanRepayments.some(lr => lr.loan_id === l.id && lr.credited_account_id === accountId)) ||
        moneyBoxTransactions.some(mbt => transactions.find(t => t.id === mbt.linked_transaction_id)?.account_id === accountId) ||
        debtPayments.some(dp => transactions.find(t=> t.id === dp.linked_expense_transaction_id)?.account_id === accountId) // Check if account used in debt payments
      ) {
      addToast("Conta em uso. Remova/reatribua transações, recorrências, empréstimos ou pagamentos de dívidas primeiro.", 'error'); return;
    }
    if (window.confirm('Excluir esta conta?')) {
      const { error } = await supabase.from('accounts').delete().eq('id', accountId).eq('user_id', user.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setAccounts(prev => prev.filter(acc => acc.id !== accountId)); addToast('Conta excluída!', 'success'); }
    }
  };

  const handleAddCategory = async (category: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('categories').insert({ ...category, user_id: user.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setCategories(prev => [...prev, data as Category].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Categoria adicionada!', 'success');}
  };
  const handleUpdateCategory = async (updatedCategory: Category) => {
    if (!user) return;
    const { data, error } = await supabase.from('categories').update(updatedCategory).eq('id', updatedCategory.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setCategories(prev => prev.map(cat => cat.id === data.id ? data as Category : cat).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Categoria atualizada!', 'success');}
  };
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    if (transactions.some(t => t.category_id === categoryId) || recurringTransactions.some(rt => rt.category_id === categoryId)) {
        addToast("Categoria em uso. Remova/reatribua transações ou recorrências primeiro.", 'error'); return;
    }
    if (window.confirm('Excluir esta categoria?')) {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId).eq('user_id', user.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setCategories(prev => prev.filter(cat => cat.id !== categoryId)); addToast('Categoria excluída!', 'success');}
    }
  };

  const handleAddCreditCard = async (card: Omit<CreditCard, 'id'|'user_id'|'created_at'|'updated_at'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('credit_cards').insert({ ...card, user_id: user.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setCreditCards(prev => [...prev, data as CreditCard].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Cartão adicionado!', 'success'); }
  };
  const handleUpdateCreditCard = async (updatedCard: CreditCard) => {
    if (!user) return;
    const { data, error } = await supabase.from('credit_cards').update(updatedCard).eq('id', updatedCard.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setCreditCards(prev => prev.map(cc => cc.id === data.id ? data as CreditCard : cc).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Cartão atualizado!', 'success'); }
  };
  const handleDeleteCreditCard = async (cardId: string) => {
     if (!user) return;
    if (installmentPurchases.some(ip => ip.credit_card_id === cardId) || 
        loans.some(l => l.linked_credit_card_id === cardId) ||
        transactions.some(t => t.account_id === cardId && t.type === TransactionType.EXPENSE)
    ) {
        addToast("Cartão em uso em compras, empréstimos ou débitos diretos. Remova-os primeiro.", 'error'); return;
    }
    if (window.confirm('Excluir este cartão?')) {
      const { error } = await supabase.from('credit_cards').delete().eq('id', cardId).eq('user_id', user.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setCreditCards(prev => prev.filter(cc => cc.id !== cardId)); addToast('Cartão excluído!', 'success'); }
    }
  };

  const handleAddInstallmentPurchase = async (purchase: Omit<InstallmentPurchase, 'id'|'user_id'|'created_at'|'updated_at'>, showToast = true) => {
    if (!user) return;
    const { data, error } = await supabase.from('installment_purchases').insert({ ...purchase, user_id: user.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { 
        setInstallmentPurchases(prev => [...prev, data as InstallmentPurchase].sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()));
        if (showToast) addToast('Compra parcelada adicionada!', 'success'); 
    }
  };
  const handleUpdateInstallmentPurchase = async (updatedPurchase: InstallmentPurchase, showToast = true) => {
     if (!user) return;
    const { data, error } = await supabase.from('installment_purchases').update(updatedPurchase).eq('id', updatedPurchase.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { 
        setInstallmentPurchases(prev => prev.map(ip => ip.id === data.id ? data as InstallmentPurchase : ip).sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())); 
        if (showToast) addToast('Compra parcelada atualizada!', 'success'); 
    }
  };
  const handleDeleteInstallmentPurchase = async (purchaseId: string, cascadeDeleteTransaction = true) => {
    if (!user) return;
    const purchaseToDelete = installmentPurchases.find(ip => ip.id === purchaseId);

    if (loans.some(l => l.linked_installment_purchase_id === purchaseId)) {
        addToast("Esta compra parcelada está vinculada a um empréstimo. Remova o vínculo no empréstimo primeiro.", 'error'); return;
    }

    const confirmMessage = (purchaseToDelete?.linked_transaction_id && purchaseToDelete.number_of_installments === 1 && cascadeDeleteTransaction)
        ? 'Excluir esta compra e a transação de despesa original vinculada?'
        : 'Excluir esta compra parcelada?';

    if (window.confirm(confirmMessage)) {
      if (purchaseToDelete?.linked_transaction_id && purchaseToDelete.number_of_installments === 1 && cascadeDeleteTransaction) {
        const { error: txError } = await supabase.from('transactions').delete().eq('id', purchaseToDelete.linked_transaction_id).eq('user_id', user.id);
        if (txError) { addToast(`Erro ao excluir transação vinculada: ${txError.message}`, 'error'); }
        else { setTransactions(prev => prev.filter(t => t.id !== purchaseToDelete.linked_transaction_id)); }
      }

      const { error } = await supabase.from('installment_purchases').delete().eq('id', purchaseId).eq('user_id', user.id);
      if (error) { addToast(`Erro ao excluir compra: ${error.message}`, 'error'); }
      else { setInstallmentPurchases(prev => prev.filter(ip => ip.id !== purchaseId)); addToast('Compra parcelada excluída!', 'success'); }
    }
  };
   const handleMarkInstallmentPaid = async (purchaseId: string) => {
    if (!user) return;
    const purchase = installmentPurchases.find(p => p.id === purchaseId);
    if (!purchase) return;
    if (purchase.installments_paid < purchase.number_of_installments) {
      const updatedPurchase = { ...purchase, installments_paid: purchase.installments_paid + 1 };
      await handleUpdateInstallmentPurchase(updatedPurchase); 
    }
  };

  const handlePayMonthlyInstallments = async (cardId: string): Promise<void> => {
    if (!user) return;
    const card = creditCards.find(c => c.id === cardId);
    if (!card) {
      addToast("Cartão não encontrado.", 'error');
      return;
    }
    const eligible = getEligibleInstallmentsForBillingCycle(installmentPurchases, card, new Date());
    if (eligible.length === 0) {
      addToast("Nenhuma parcela elegível para pagamento neste ciclo.", 'info');
      return;
    }

    const updates = eligible.map(p => {
      const updatedPurchase = { ...p, installments_paid: p.installments_paid + 1 };
      return supabase
        .from('installment_purchases')
        .update({ installments_paid: updatedPurchase.installments_paid, updated_at: new Date().toISOString() })
        .eq('id', p.id)
        .eq('user_id', user.id)
        .select()
        .single();
    });

    try {
      const results = await Promise.all(updates);
      const updatedIPs: InstallmentPurchase[] = [];
      let errors = 0;
      results.forEach(res => {
        if (res.error) {
          errors++;
          console.error("Error updating installment:", res.error);
        } else if (res.data) {
          updatedIPs.push(res.data as InstallmentPurchase);
        }
      });

      if (updatedIPs.length > 0) {
        setInstallmentPurchases(prev =>
          prev.map(ip => {
            const updatedVersion = updatedIPs.find(uip => uip.id === ip.id);
            return updatedVersion || ip;
          }).sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
        );
        addToast(`${updatedIPs.length} parcela(s) da fatura marcada(s) como paga(s)!`, 'success');
      }
      if (errors > 0) {
        addToast(`Falha ao pagar ${errors} parcela(s).`, 'error');
      }
    } catch (error: any) {
      addToast(`Erro ao processar pagamento das parcelas: ${error.message}`, 'error');
    }
  };

  const handleAddMoneyBox = async (moneyBox: Omit<MoneyBox, 'id'|'user_id'|'created_at'|'updated_at'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('money_boxes').insert({ ...moneyBox, user_id: user.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setMoneyBoxes(prev => [...prev, data as MoneyBox].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Caixinha adicionada!', 'success');}
  };
  const handleUpdateMoneyBox = async (updatedMoneyBox: MoneyBox) => {
    if (!user) return;
    const { data, error } = await supabase.from('money_boxes').update(updatedMoneyBox).eq('id', updatedMoneyBox.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setMoneyBoxes(prev => prev.map(mb => mb.id === data.id ? data as MoneyBox : mb).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Caixinha atualizada!', 'success');}
  };
  const handleDeleteMoneyBox = async (moneyBoxId: string) => {
      if (!user) return;
      if (moneyBoxTransactions.some(mbt => mbt.money_box_id === moneyBoxId)) {
        addToast("Caixinha possui transações. Exclua as transações primeiro.", 'error'); return;
      }
      if (window.confirm('Excluir esta caixinha?')) {
        const { error } = await supabase.from('money_boxes').delete().eq('id', moneyBoxId).eq('user_id', user.id);
        if (error) { addToast(`Erro ao excluir caixinha: ${error.message}`, 'error');}
        else {setMoneyBoxes(prev => prev.filter(mb => mb.id !== moneyBoxId)); addToast('Caixinha excluída!', 'success');}
      }
  };

  const handleAddMoneyBoxTransaction = async (mbt: Omit<MoneyBoxTransaction, 'id'|'user_id'|'created_at'|'updated_at'|'linked_transaction_id'>, createLinkedTransaction: boolean, linkedAccId?: string) => {
    if (!user) return;
    let linkedTxId: string | undefined = undefined;
    if (createLinkedTransaction && linkedAccId) {
        const mainTxType = mbt.type === MoneyBoxTransactionType.DEPOSIT ? TransactionType.EXPENSE : TransactionType.INCOME;
        const mainTxDescription = `${mbt.type === MoneyBoxTransactionType.DEPOSIT ? 'Depósito para' : 'Saque de'} Caixinha: ${moneyBoxes.find(mb=>mb.id === mbt.money_box_id)?.name || 'N/A'}`;
        const {data: mainTxData, error: mainTxError} = await supabase.from('transactions').insert({
            user_id: user.id,
            type: mainTxType,
            amount: mbt.amount,
            date: mbt.date,
            account_id: linkedAccId,
            description: mainTxDescription,
        }).select().single();
        if (mainTxError || !mainTxData) { addToast(`Erro ao criar transação principal: ${mainTxError?.message || 'Falha'}`, 'error'); return; }
        linkedTxId = mainTxData.id;
        setTransactions(prev => [mainTxData as Transaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }

    const { data, error } = await supabase.from('money_box_transactions').insert({ ...mbt, user_id: user.id, linked_transaction_id: linkedTxId }).select().single();
    if (error) { addToast(`Erro ao adicionar transação da caixinha: ${error.message}`, 'error'); }
    else if (data) { setMoneyBoxTransactions(prev => [...prev, data as MoneyBoxTransaction]); addToast('Transação da caixinha adicionada!', 'success'); }
  };
  const handleDeleteMoneyBoxTransaction = async (mbtId: string, linkedTransactionId?: string) => {
    if (!user) return;
    if (window.confirm(`Excluir esta transação da caixinha? ${linkedTransactionId ? '\\nA transação principal vinculada NÃO será excluída automaticamente por esta ação.' : ''}`)) {
      const { error } = await supabase.from('money_box_transactions').delete().eq('id', mbtId).eq('user_id', user.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setMoneyBoxTransactions(prev => prev.filter(mbt => mbt.id !== mbtId)); addToast('Transação da caixinha excluída!', 'success'); }
    }
  };

  const handleAddTag = async (tag: Omit<Tag, 'id'|'user_id'|'created_at'|'updated_at'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('tags').insert({ ...tag, user_id: user.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setTags(prev => [...prev, data as Tag].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Tag adicionada!', 'success');}
  };
  const handleUpdateTag = async (updatedTag: Tag) => {
     if (!user) return;
    const { data, error } = await supabase.from('tags').update(updatedTag).eq('id', updatedTag.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setTags(prev => prev.map(t => t.id === data.id ? data as Tag : t).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Tag atualizada!', 'success');}
  };
  const handleDeleteTag = async (tagId: string) => {
     if (!user) return;
    if (transactions.some(t => t.tag_ids?.includes(tagId))) {
        addToast("Tag em uso. Remova-a das transações primeiro.", 'error'); return;
    }
    if (window.confirm('Excluir esta tag?')) {
      const { error } = await supabase.from('tags').delete().eq('id', tagId).eq('user_id', user.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setTags(prev => prev.filter(t => t.id !== tagId)); addToast('Tag excluída!', 'success');}
    }
  };
  
  const handleAddRecurringTransaction = async (rt: Omit<RecurringTransaction, 'id'|'user_id'|'created_at'|'updated_at'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('recurring_transactions').insert({ ...rt, user_id: user.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setRecurringTransactions(prev => [...prev, data as RecurringTransaction].sort((a,b)=>new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())); addToast('Recorrência adicionada!', 'success');}
  };
  const handleUpdateRecurringTransaction = async (updatedRT: RecurringTransaction) => {
     if (!user) return;
    const { data, error } = await supabase.from('recurring_transactions').update(updatedRT).eq('id', updatedRT.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setRecurringTransactions(prev => prev.map(r => r.id === data.id ? data as RecurringTransaction : r).sort((a,b)=>new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())); addToast('Recorrência atualizada!', 'success');}
  };
  const handleDeleteRecurringTransaction = async (rtId: string) => {
    if (!user) return;
    if (window.confirm('Excluir esta recorrência?')) {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', rtId).eq('user_id', user.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setRecurringTransactions(prev => prev.filter(r => r.id !== rtId)); addToast('Recorrência excluída!', 'success'); }
    }
  };
  const handleProcessRecurringTransactions = async (): Promise<{ count: number; errors: string[] }> => {
    if (!user) return { count: 0, errors: ["Usuário não logado."]};
    const today = getISODateString();
    const toProcess = recurringTransactions.filter(rt => !rt.is_paused && rt.next_due_date <= today && (rt.remaining_occurrences === undefined || rt.remaining_occurrences > 0));
    let count = 0;
    const errors: string[] = [];

    for (const rt of toProcess) {
        const transactionData: Omit<Transaction, 'id'|'user_id'|'created_at'|'updated_at'|'tag_ids'> = { 
            type: rt.type, amount: rt.amount, category_id: rt.category_id,
            description: `Rec: ${rt.description}`, date: rt.next_due_date, 
            account_id: rt.account_id, to_account_id: rt.to_account_id,
        };
        await handleAddTransaction(transactionData); 
        
        const newNextDueDate = geminiService.calculateNextDueDate(rt.next_due_date, rt.frequency, rt.custom_interval_days);
        const updatedRTData: Partial<RecurringTransaction> = {
            last_posted_date: rt.next_due_date,
            next_due_date: newNextDueDate,
            remaining_occurrences: rt.remaining_occurrences !== undefined ? Math.max(0, rt.remaining_occurrences - 1) : undefined,
        };
        const {error: rtUpdateError} = await supabase.from('recurring_transactions').update(updatedRTData).eq('id', rt.id).eq('user_id', user.id);
        if (rtUpdateError) errors.push(`Erro ao atualizar ${rt.description}: ${rtUpdateError.message}`);
        else {
          setRecurringTransactions(prevRts => prevRts.map(r => r.id === rt.id ? {...r, ...updatedRTData} as RecurringTransaction : r).sort((a,b)=>new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()));
          count++;
        }
    }
    return { count, errors };
  };

  const handleAddLoan = async (loanData: Omit<Loan, 'id'|'user_id'|'created_at'|'updated_at'|'linked_expense_transaction_id'|'linked_installment_purchase_id'>, ccInstallmentsFromForm?: number) => {
    if (!user) return;
    let linkedExpenseTxId: string | undefined = undefined;
    let linkedInstallmentPurchaseId: string | undefined = undefined;

    if (loanData.funding_source === 'account' && loanData.linked_account_id && loanData.amount_delivered_from_account) {
        const { data: expTx, error: expError } = await supabase.from('transactions').insert({
            user_id: user.id, type: TransactionType.EXPENSE, amount: loanData.amount_delivered_from_account,
            date: loanData.loan_date, account_id: loanData.linked_account_id,
            description: `Empréstimo para ${loanData.person_name}`,
        }).select().single();
        if (expError || !expTx) { addToast(`Erro ao criar despesa vinculada: ${expError?.message || 'Falha'}`, 'error'); return; }
        linkedExpenseTxId = expTx.id;
        setTransactions(prev => [expTx as Transaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else if (loanData.funding_source === 'creditCard' && loanData.linked_credit_card_id && loanData.cost_on_credit_card && ccInstallmentsFromForm) {
        const ipData: Omit<InstallmentPurchase, 'id'|'user_id'|'created_at'|'updated_at'> = {
            credit_card_id: loanData.linked_credit_card_id,
            description: `Empréstimo (crédito) para ${loanData.person_name}`,
            purchase_date: loanData.loan_date,
            total_amount: loanData.cost_on_credit_card,
            number_of_installments: ccInstallmentsFromForm,
            installments_paid: 0,
        };
        await handleAddInstallmentPurchase(ipData, false); 
        const latestIp = installmentPurchases.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        if (latestIp?.description.startsWith(`Empréstimo (crédito) para ${loanData.person_name}`)) {
             linkedInstallmentPurchaseId = latestIp.id;
        } else {
             addToast('Aviso: Não foi possível vincular automaticamente a compra parcelada ao empréstimo. Verifique manualmente.', 'warning');
        }
    }

    const finalLoanData = { ...loanData, user_id: user.id, linked_expense_transaction_id: linkedExpenseTxId, linked_installment_purchase_id: linkedInstallmentPurchaseId };
    const { data, error } = await supabase.from('loans').insert(finalLoanData).select().single();
    if (error) { addToast(`Erro ao adicionar empréstimo: ${error.message}`, 'error'); }
    else if (data) { setLoans(prev => [...prev, data as Loan].sort((a,b)=>new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime())); addToast('Empréstimo adicionado!', 'success'); }
  };
  const handleUpdateLoan = async (updatedLoanData: Omit<Loan, 'user_id'|'created_at'|'updated_at'|'linked_expense_transaction_id'|'linked_installment_purchase_id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('loans').update(updatedLoanData).eq('id', updatedLoanData.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setLoans(prev => prev.map(l => l.id === data.id ? data as Loan : l).sort((a,b)=>new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime())); addToast('Empréstimo atualizado!', 'success');}
  };
  const handleDeleteLoan = async (loanId: string) => {
    if (!user) return;
    if (loanRepayments.some(rp => rp.loan_id === loanId)) {
      addToast("Este empréstimo possui pagamentos. Exclua os pagamentos primeiro.", 'error'); return;
    }
    if (window.confirm('Excluir este empréstimo? Isso também excluirá a despesa/compra parcelada vinculada, se houver.')) {
        const loanToDelete = loans.find(l=>l.id === loanId);
        if (loanToDelete?.linked_expense_transaction_id) {
            await supabase.from('transactions').delete().eq('id', loanToDelete.linked_expense_transaction_id).eq('user_id', user.id);
            setTransactions(prev => prev.filter(t => t.id !== loanToDelete.linked_expense_transaction_id));
        }
        if (loanToDelete?.linked_installment_purchase_id) {
            await supabase.from('installment_purchases').delete().eq('id', loanToDelete.linked_installment_purchase_id).eq('user_id', user.id);
            setInstallmentPurchases(prev => prev.filter(ip => ip.id !== loanToDelete.linked_installment_purchase_id));
        }

        const { error } = await supabase.from('loans').delete().eq('id', loanId).eq('user_id', user.id);
        if (error) { addToast(`Erro ao excluir empréstimo: ${error.message}`, 'error');}
        else { setLoans(prev => prev.filter(l => l.id !== loanId)); addToast('Empréstimo excluído!', 'success');}
    }
  };
  const handleAddLoanRepayment = async (repaymentData: Omit<LoanRepayment, 'id'|'user_id'|'created_at'|'updated_at'|'linked_income_transaction_id'>, loanId: string) => {
    if (!user) return;
    const loan = loans.find(l => l.id === loanId);
    if (!loan) { addToast("Empréstimo não encontrado.", 'error'); return; }

    const { data: incTx, error: incError } = await supabase.from('transactions').insert({
        user_id: user.id, type: TransactionType.INCOME, amount: repaymentData.amount_paid,
        date: repaymentData.repayment_date, account_id: repaymentData.credited_account_id,
        description: `Recebimento empréstimo de ${loan.person_name}`,
    }).select().single();
    if (incError || !incTx) { addToast(`Erro ao criar receita vinculada: ${incError?.message || 'Falha'}`, 'error'); return; }
    setTransactions(prev => [incTx as Transaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    const finalRepaymentData = { ...repaymentData, user_id: user.id, loan_id: loanId, linked_income_transaction_id: incTx.id };
    const { data, error } = await supabase.from('loan_repayments').insert(finalRepaymentData).select().single();
    if (error) { addToast(`Erro ao adicionar pagamento: ${error.message}`, 'error'); }
    else if (data) { setLoanRepayments(prev => [...prev, data as LoanRepayment]); addToast('Pagamento registrado!', 'success'); }
  };

  const handleAddFuturePurchase = async (purchaseData: Omit<FuturePurchase, 'id'|'user_id'|'created_at'|'updated_at'|'status' | 'ai_analysis' | 'ai_analyzed_at'>) => {
    if (!user) return;
    const newPurchase: Omit<FuturePurchase, 'id'|'created_at'|'updated_at'> = {
        ...purchaseData, user_id: user.id, status: 'PLANNED', 
    };
    const { data, error } = await supabase.from('future_purchases').insert(newPurchase).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setFuturePurchases(prev => [...prev, data as FuturePurchase]); addToast('Compra futura adicionada!', 'success'); }
  };
  const handleUpdateFuturePurchase = async (updatedPurchaseData: Omit<FuturePurchase, 'user_id'|'created_at'|'updated_at'|'status' | 'ai_analysis' | 'ai_analyzed_at'>) => {
    if (!user) return;
    const purchaseToUpdate = futurePurchases.find(p => p.id === updatedPurchaseData.id);
    if (!purchaseToUpdate) return;
    const finalUpdateData = { ...purchaseToUpdate, ...updatedPurchaseData }; 

    const { data, error } = await supabase.from('future_purchases').update(finalUpdateData).eq('id', finalUpdateData.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setFuturePurchases(prev => prev.map(p => p.id === data.id ? data as FuturePurchase : p)); addToast('Compra futura atualizada!', 'success'); }
  };
  const handleDeleteFuturePurchase = async (purchaseId: string) => {
    if (!user) return;
    if (window.confirm('Excluir esta compra futura?')) {
      const { error } = await supabase.from('future_purchases').delete().eq('id', purchaseId).eq('user_id', user.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setFuturePurchases(prev => prev.filter(p => p.id !== purchaseId)); addToast('Compra futura excluída!', 'success'); }
    }
  };

   const handleUpdateAIInsight = async (updatedInsight: AIInsight) => {
     if (!user) return;
    const { data, error } = await supabase.from('ai_insights').update({is_read: updatedInsight.is_read}).eq('id', updatedInsight.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro ao atualizar insight: ${error.message}`, 'error'); }
    else if (data) { setAiInsights(prev => prev.map(i => i.id === data.id ? data as AIInsight : i).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));}
  };
  
  // --- Debt Planner Handlers ---
  const handleAddDebt = async (debtData: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'>) => {
    if (!user) return;
    const newDebt = { 
        ...debtData, 
        user_id: user.id, 
        current_balance: debtData.initial_balance, // current_balance starts as initial_balance
        is_archived: false 
    };
    const { data, error } = await supabase.from('debts').insert(newDebt).select().single();
    if (error) { addToast(`Erro ao adicionar dívida: ${error.message}`, 'error'); }
    else if (data) { setDebts(prev => [...prev, data as Debt].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())); addToast('Dívida adicionada!', 'success'); }
  };

  const handleUpdateDebt = async (updatedDebtData: Debt) => {
    if (!user) return;
    const { data, error } = await supabase.from('debts').update(updatedDebtData).eq('id', updatedDebtData.id).eq('user_id', user.id).select().single();
    if (error) { addToast(`Erro ao atualizar dívida: ${error.message}`, 'error'); }
    else if (data) { setDebts(prev => prev.map(d => d.id === data.id ? data as Debt : d)); addToast('Dívida atualizada!', 'success'); }
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!user) return;
    if (debtPayments.some(dp => dp.debt_id === debtId)) {
      addToast("Esta dívida possui pagamentos registrados. Exclua os pagamentos primeiro.", 'error');
      return;
    }
    if (window.confirm('Excluir esta dívida?')) {
      const { error } = await supabase.from('debts').delete().eq('id', debtId).eq('user_id', user.id);
      if (error) { addToast(`Erro ao excluir dívida: ${error.message}`, 'error'); }
      else { setDebts(prev => prev.filter(d => d.id !== debtId)); addToast('Dívida excluída!', 'success'); }
    }
  };

  const handleAddDebtPayment = async (
    paymentData: Omit<DebtPayment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id'>,
    createLinkedExpense: boolean,
    linkedAccountId?: string
  ) => {
    if (!user) return;
    const debt = debts.find(d => d.id === paymentData.debt_id);
    if (!debt) { addToast("Dívida não encontrada.", 'error'); return; }

    let linkedTxId: string | undefined = undefined;
    if (createLinkedExpense && linkedAccountId) {
      const expenseTxData = {
        type: TransactionType.EXPENSE,
        amount: paymentData.amount_paid,
        category_id: categories.find(c => c.name.toLowerCase().includes('pagamento de dívida') || c.name.toLowerCase().includes('empréstimo'))?.id, // Try to find a suitable category
        description: `Pagamento: ${debt.name}`,
        date: paymentData.payment_date,
        account_id: linkedAccountId,
      };
      const { data: newTx, error: txError } = await supabase.from('transactions').insert({ ...expenseTxData, user_id: user.id }).select().single();
      if (txError || !newTx) { addToast(`Erro ao criar despesa vinculada: ${txError?.message || 'Falha'}`, 'error'); return; }
      linkedTxId = newTx.id;
      setTransactions(prev => [newTx as Transaction, ...prev]);
    }
    
    const newPayment = { ...paymentData, user_id: user.id, linked_expense_transaction_id: linkedTxId };
    const { data: savedPayment, error: paymentError } = await supabase.from('debt_payments').insert(newPayment).select().single();

    if (paymentError) { addToast(`Erro ao registrar pagamento da dívida: ${paymentError.message}`, 'error'); return; }
    
    if (savedPayment) {
      setDebtPayments(prev => [...prev, savedPayment as DebtPayment]);
      const updatedDebt = { ...debt, current_balance: Math.max(0, debt.current_balance - savedPayment.amount_paid) };
      // if (updatedDebt.current_balance === 0) updatedDebt.is_archived = true; // Auto-archive if paid off
      await handleUpdateDebt(updatedDebt); // This will also update the state for debts
      addToast('Pagamento da dívida registrado!', 'success');
    }
  };


  const openTransactionModalForNew = () => { setEditingTransaction(null); setIsTransactionModalOpen(true); };
  const openTransactionModalForEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setIsTransactionModalOpen(true); };
  

  const navItems = [
    { view: 'DASHBOARD', label: 'Painel Geral', icon: <ChartPieIcon /> },
    { view: 'TRANSACTIONS', label: 'Transações', icon: <ListBulletIcon /> },
    { view: 'ACCOUNTS', label: 'Contas', icon: <CreditCardIcon /> }, 
    { view: 'CATEGORIES', label: 'Categorias', icon: <TagIcon /> },
    { view: 'CREDIT_CARDS', label: 'Cartões de Crédito', icon: <CreditCardIcon /> },
    { view: 'MONEY_BOXES', label: 'Caixinhas', icon: <PiggyBankIcon /> },
    { view: 'FUTURE_PURCHASES', label: 'Compras Futuras', icon: <ShoppingCartIcon /> },
    { view: 'TAGS', label: 'Tags', icon: <BookmarkSquareIcon /> }, 
    { view: 'RECURRING_TRANSACTIONS', label: 'Recorrências', icon: <ArrowPathIcon /> },
    { view: 'LOANS', label: 'Empréstimos', icon: <UsersIcon /> },
    { view: 'DEBT_PLANNER', label: 'Planejador Dívidas', icon: <BanknotesIcon /> },
    { view: 'AI_COACH', label: 'AI Coach', icon: <ChatBubbleLeftRightIcon /> },
    { view: 'DATA_MANAGEMENT', label: 'Dados', icon: <CogIcon /> },
  ];
  const mobileNavItems = navItems.filter(item => ['DASHBOARD', 'TRANSACTIONS', 'AI_COACH', 'DEBT_PLANNER', 'ACCOUNTS'].includes(item.view)).slice(0,5);

  if (isLoadingSession || (user && isLoadingData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-backgroundDark">
        <p className="text-lg text-textMuted dark:text-textMutedDark">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginWithGoogle={handleSignInWithGoogle} isLoading={isLoadingSession} />;
  }

  const handleViewRecurringTransaction = (transactionId: string) => {
    const rt = recurringTransactions.find(r => r.id === transactionId);
    if (rt) {
        setActiveView('RECURRING_TRANSACTIONS' as AppView);
    } else {
        addToast("Transação recorrente não encontrada.", "warning");
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'DASHBOARD':
        return <DashboardView transactions={transactions} accounts={accounts} categories={categories} creditCards={creditCards} installmentPurchases={installmentPurchases} moneyBoxes={moneyBoxes} loans={loans} loanRepayments={loanRepayments} recurringTransactions={recurringTransactions} onAddTransaction={openTransactionModalForNew} calculateAccountBalance={calculateAccountBalance} calculateMoneyBoxBalance={calculateMoneyBoxBalance} onViewRecurringTransaction={handleViewRecurringTransaction} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'TRANSACTIONS':
        return <TransactionsView transactions={transactions} accounts={accounts} categories={categories} tags={tags} installmentPurchases={installmentPurchases} onAddTransaction={openTransactionModalForNew} onEditTransaction={openTransactionModalForEdit} onDeleteTransaction={handleDeleteTransaction} isLoading={isLoadingData} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'ACCOUNTS':
        return <AccountsView accounts={accounts} transactions={transactions} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount} calculateAccountBalance={calculateAccountBalance} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'CREDIT_CARDS':
        return <CreditCardsView
          creditCards={creditCards}
          installmentPurchases={installmentPurchases}
          aiConfig={aiConfig}
          onAddCreditCard={handleAddCreditCard}
          onUpdateCreditCard={handleUpdateCreditCard}
          onDeleteCreditCard={handleDeleteCreditCard}
          onAddInstallmentPurchase={handleAddInstallmentPurchase}
          onUpdateInstallmentPurchase={handleUpdateInstallmentPurchase}
          onDeleteInstallmentPurchase={handleDeleteInstallmentPurchase}
          onMarkInstallmentPaid={handleMarkInstallmentPaid}
          onPayMonthlyInstallments={handlePayMonthlyInstallments}
          isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'CATEGORIES':
        return <CategoriesView categories={categories} transactions={transactions} aiConfig={aiConfig} onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onSuggestBudget={handleSuggestCategoryBudget} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'MONEY_BOXES':
        return <MoneyBoxesView moneyBoxes={moneyBoxes} moneyBoxTransactions={moneyBoxTransactions} accounts={accounts} onAddMoneyBox={handleAddMoneyBox} onUpdateMoneyBox={handleUpdateMoneyBox} onDeleteMoneyBox={handleDeleteMoneyBox} onAddMoneyBoxTransaction={handleAddMoneyBoxTransaction} onDeleteMoneyBoxTransaction={handleDeleteMoneyBoxTransaction} calculateMoneyBoxBalance={calculateMoneyBoxBalance} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'FUTURE_PURCHASES':
        return <FuturePurchasesView futurePurchases={futurePurchases} onAddFuturePurchase={handleAddFuturePurchase} onUpdateFuturePurchase={handleUpdateFuturePurchase} onDeleteFuturePurchase={handleDeleteFuturePurchase} onAnalyzeFuturePurchase={handleAnalyzeFuturePurchase} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'TAGS':
        return <TagsView tags={tags} transactions={transactions} onAddTag={handleAddTag} onUpdateTag={handleUpdateTag} onDeleteTag={handleDeleteTag} />;
      case 'RECURRING_TRANSACTIONS':
        return <RecurringTransactionsView recurringTransactions={recurringTransactions} accounts={accounts} categories={categories} onAddRecurringTransaction={handleAddRecurringTransaction} onUpdateRecurringTransaction={handleUpdateRecurringTransaction} onDeleteRecurringTransaction={handleDeleteRecurringTransaction} onProcessRecurringTransactions={handleProcessRecurringTransactions} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'LOANS':
        return <LoansView loans={loans} loanRepayments={loanRepayments} accounts={accounts} creditCards={creditCards} onAddLoan={handleAddLoan} onUpdateLoan={handleUpdateLoan} onDeleteLoan={handleDeleteLoan} onAddLoanRepayment={handleAddLoanRepayment} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'DEBT_PLANNER':
        return <DebtPlannerView 
                  debts={debts} 
                  debtPayments={debtPayments} 
                  accounts={accounts}
                  onAddDebt={handleAddDebt}
                  onUpdateDebt={handleUpdateDebt}
                  onDeleteDebt={handleDeleteDebt}
                  onAddDebtPayment={handleAddDebtPayment}
                  isPrivacyModeEnabled={isPrivacyModeEnabled} 
                />;
      case 'AI_COACH':
        return <AICoachView 
                    aiConfig={aiConfig} 
                    setAiConfig={updateAiConfig} 
                    insights={aiInsights} 
                    onFetchGeneralAdvice={handleFetchGeneralAIAdvice} 
                    onUpdateInsight={handleUpdateAIInsight} 
                    isPrivacyModeEnabled={isPrivacyModeEnabled}
                    onFetchRecurringPaymentCandidates={handleFetchRecurringPaymentCandidates}
                    onFetchSavingOpportunities={handleFetchSavingOpportunities}
                    onFetchCashFlowProjection={handleFetchCashFlowProjection}
                />;
      case 'DATA_MANAGEMENT':
        return <DataManagementView
                  allData={{ transactions, accounts, categories, creditCards, installmentPurchases, moneyBoxes, moneyBoxTransactions, futurePurchases, tags, recurringTransactions, loans, loanRepayments, aiInsights, debts, debtPayments }} // Added debts, debtPayments
                  userPreferencesToExport={{theme, is_privacy_mode_enabled: isPrivacyModeEnabled, ai_is_enabled: aiConfig.isEnabled, ai_monthly_income: aiConfig.monthlyIncome, ai_auto_backup_enabled: aiConfig.autoBackupToFileEnabled }}
                  activeProfileName={activeUserDisplayName}
                  setAiConfig={updateAiConfig} 
                  user={user}
                />;
      default:
        setActiveView('DASHBOARD' as AppView);
        return <DashboardView transactions={transactions} accounts={accounts} categories={categories} creditCards={creditCards} installmentPurchases={installmentPurchases} moneyBoxes={moneyBoxes} loans={loans} loanRepayments={loanRepayments} recurringTransactions={recurringTransactions} onAddTransaction={openTransactionModalForNew} calculateAccountBalance={calculateAccountBalance} calculateMoneyBoxBalance={calculateMoneyBoxBalance} onViewRecurringTransaction={handleViewRecurringTransaction} isPrivacyModeEnabled={isPrivacyModeEnabled}/>;
    }
  };


  return (
    <div className="min-h-screen bg-background text-textBase dark:bg-backgroundDark dark:text-textBaseDark flex flex-col md:flex-row transition-colors duration-300">
      <nav className="hidden md:flex flex-col w-64 bg-surface dark:bg-surfaceDark border-r border-borderBase dark:border-borderBaseDark p-4 fixed top-0 left-0 h-full shadow-lg dark:shadow-neutralDark/40 overflow-y-auto">
         <div className="px-2 py-3 mb-1">
          <h1 className="text-2xl font-bold text-primary dark:text-primaryDark">{APP_NAME}</h1>
           <div className="flex items-center mt-2 space-x-2">
            {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full" />
            ) : (
                <UserCircleIcon className="w-8 h-8 text-textMuted dark:text-textMutedDark" />
            )}
            <div>
                <p className="text-sm font-medium text-textBase dark:text-textBaseDark truncate" title={activeUserDisplayName}>{activeUserDisplayName}</p>
                <Button variant="ghost" size="sm" onClick={togglePrivacyMode} className="!p-1 text-xs text-textMuted dark:text-textMutedDark hover:text-primary dark:hover:text-primaryDark">
                    {isPrivacyModeEnabled ? <EyeSlashIcon className="w-4 h-4 mr-1" /> : <EyeIcon className="w-4 h-4 mr-1" />}
                    {isPrivacyModeEnabled ? 'Modo Privado' : 'Normal'}
                </Button>
            </div>
           </div>
        </div>
        <div className="flex-grow space-y-1">
            {navItems.map(item => {
              if (item.view === 'AI_COACH' && aiConfig.apiKeyStatus === 'unavailable') {
                return null;
              }
              return (
                <Button
                    key={item.view}
                    variant="ghost"
                    onClick={() => setActiveView(item.view as AppView)}
                    className={`w-full flex items-center justify-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                ${activeView === item.view
                                ? '!bg-primary/10 !text-primary dark:!bg-primaryDark/20 dark:!text-primaryDark'
                                : '!text-textMuted dark:!text-textMutedDark hover:!bg-neutral/5 dark:hover:!bg-neutralDark/10 hover:!text-textBase dark:hover:!text-textBaseDark'
                                }`}
                    aria-current={activeView === item.view ? 'page' : undefined}
                >
                    {React.cloneElement(item.icon, { className: "w-5 h-5 mr-3 flex-shrink-0" })}
                    <span className="flex-1 truncate">{item.label}</span>
                     {item.view === 'AI_COACH' && aiConfig.isEnabled && aiConfig.apiKeyStatus === 'available' && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" title="AI Coach Ativado"></span>
                    )}
                </Button>
              );
            })}
        </div>
        <div className="mt-auto pt-2 space-y-2">
            <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full flex items-center justify-start px-3 py-2.5 rounded-lg text-sm font-medium text-textMuted dark:text-textMutedDark hover:bg-neutral/5 dark:hover:bg-neutralDark/10 hover:!text-destructive dark:hover:!text-destructiveDark"
                title="Sair"
            >
                <PowerIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="flex-1 truncate">Sair</span>
            </Button>
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
        </div>
      </nav>

      <main className="flex-1 md:ml-64 overflow-y-auto pb-20 md:pb-0">
        {renderView()}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface dark:bg-surfaceDark border-t border-borderBase dark:border-borderBaseDark shadow-top p-1 grid grid-cols-5 gap-1 z-20">
        {mobileNavItems.map(item => {
          if (item.view === 'AI_COACH' && aiConfig.apiKeyStatus === 'unavailable') {
            return ( <div key={item.view} className="flex flex-col items-center justify-center p-1.5 rounded-md opacity-50">...</div> );
          }
          return (
            <Button key={item.view} variant="ghost" onClick={() => setActiveView(item.view as AppView)} title={item.label}
              className={`flex flex-col items-center justify-center p-1.5 rounded-md relative
                          ${activeView === item.view ? '!text-primary dark:!text-primaryDark !bg-primary/10 dark:!bg-primaryDark/20' : '!text-textMuted dark:!text-textMutedDark hover:!text-primary dark:hover:!text-primaryDark'}`}
              aria-current={activeView === item.view ? 'page' : undefined} >
              {React.cloneElement(item.icon, { className: "w-5 h-5 mb-0.5" })}
              <span className="text-[10px] leading-tight text-center">{item.label}</span>
              {item.view === 'AI_COACH' && aiConfig.isEnabled && aiConfig.apiKeyStatus === 'available' && ( <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span> )}
            </Button>
          );
        })}
      </nav>

      <Button
        onClick={openTransactionModalForNew} title="Nova Transação" variant="primary"
        className="md:hidden fixed bottom-16 right-4 text-white rounded-full p-3 shadow-lg z-30 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        aria-label="Adicionar Nova Transação" >
        <PlusIcon className="w-7 h-7" />
      </Button>

      <Modal
        isOpen={isTransactionModalOpen}
        onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }}
        title={editingTransaction ? 'Editar Transação' : 'Nova Transação'}
        size="lg"
      >
        <TransactionForm
          onSubmit={editingTransaction ? handleUpdateTransaction : (txData) => handleAddTransaction(txData as Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>)}
          onCancel={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }}
          accounts={accounts}
          creditCards={creditCards} 
          categories={categories}
          tags={tags}
          initialTransaction={editingTransaction}
          isPrivacyModeEnabled={isPrivacyModeEnabled}
        />
      </Modal>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

interface SimulatedTransactionForProjection { // Keep consistent with AICoachView
  description?: string;
  amount: number;
  type: TransactionType;
  date: string;
}

declare module './components/MoneyBoxesView' {
    interface MoneyBoxesViewProps { onDeleteMoneyBox: (moneyBoxId: string) => void; }
}
declare module './components/AICoachView' {
    interface AICoachViewProps { 
        onUpdateInsight: (insight: AIInsight) => void; 
        onFetchRecurringPaymentCandidates: () => void;
        onFetchSavingOpportunities: () => void;
        onFetchCashFlowProjection: (projectionPeriodDays?: number, simulatedTransaction?: SimulatedTransactionForProjection) => void;
    }
}
declare module './components/DataManagementView' {
    interface DataManagementViewProps {
        allData: { 
            transactions: Transaction[]; accounts: Account[]; categories: Category[];
            creditCards: CreditCard[]; installmentPurchases: InstallmentPurchase[];
            moneyBoxes: MoneyBox[]; moneyBoxTransactions: MoneyBoxTransaction[];
            futurePurchases: FuturePurchase[]; tags: Tag[];
            recurringTransactions: RecurringTransaction[];
            loans: Loan[]; loanRepayments: LoanRepayment[];
            aiInsights: AIInsight[];
            debts: Debt[]; debtPayments: DebtPayment[]; // Added
        };
        userPreferencesToExport: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>;
        activeProfileName?: string;
        user: SupabaseUser | null;
        setAiConfig?: (configUpdater: Partial<Omit<AIConfig, 'apiKeyStatus'>>) => void;
    }
}
declare module './components/DashboardView' {
    interface DashboardViewProps { isPrivacyModeEnabled?: boolean; }
}
declare module './components/TransactionsView' {
    interface TransactionsViewProps { isLoading?: boolean; isPrivacyModeEnabled?: boolean; installmentPurchases: InstallmentPurchase[];}
}
declare module './components/AccountsView' {
    interface AccountsViewProps { isPrivacyModeEnabled?: boolean; }
}
declare module './components/CreditCardsView' {
    interface CreditCardsViewProps { 
        isPrivacyModeEnabled?: boolean; 
        aiConfig: AIConfig; 
        onPayMonthlyInstallments: (cardId: string) => Promise<void>; 
    }
}
declare module './components/CreditCardItem' {
    interface CreditCardItemProps { 
        onGetBestPurchaseDay: (cardId: string) => void; 
        isAIFeatureEnabled: boolean; 
        onPayMonthlyInstallments: (cardId: string) => Promise<void>;
    }
}
declare module './components/CategoriesView' {
    interface CategoriesViewProps { isPrivacyModeEnabled?: boolean; }
}
declare module './components/FuturePurchasesView' {
    interface FuturePurchasesViewProps { isPrivacyModeEnabled?: boolean; }
}
declare module './components/RecurringTransactionsView' {
    interface RecurringTransactionsViewProps { isPrivacyModeEnabled?: boolean; }
}
declare module './components/LoansView' {
    interface LoansViewProps { isPrivacyModeEnabled?: boolean; }
}
declare module './components/TransactionForm' {
    interface TransactionFormProps { 
        isPrivacyModeEnabled?: boolean;
        creditCards: CreditCard[]; 
    }
}
declare module './components/MoneyBoxHistoryModal' {
  interface MoneyBoxHistoryModalProps { isPrivacyModeEnabled?: boolean;}
}
declare module './components/DebtPlannerView' { // Added
  interface DebtPlannerViewProps {
    debts: Debt[];
    debtPayments: DebtPayment[];
    accounts: Account[];
    onAddDebt: (debtData: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'>) => void;
    onUpdateDebt: (debtData: Debt) => void;
    onDeleteDebt: (debtId: string) => void;
    onAddDebtPayment: (paymentData: Omit<DebtPayment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id'>, createLinkedExpense: boolean, linkedAccountId?: string) => void;
    isPrivacyModeEnabled?: boolean;
  }
}


export default App;
