
import React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef }from 'react';
import { supabase } from './services/supabaseClient';
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

import {
  Transaction, Account, Category, TransactionType, AppView, CreditCard, InstallmentPurchase,
  MoneyBox, MoneyBoxTransaction, MoneyBoxTransactionType, Theme, UserPreferences,
  Tag, RecurringTransaction, RecurringTransactionFrequency,
  Loan, LoanRepayment, LoanStatus,
  AIConfig, AIInsight, AIInsightType,
  FuturePurchase, FuturePurchaseStatus, FuturePurchasePriority, ToastType, UserProfile,
  Debt, DebtPayment, DebtStrategy, DebtProjection, AuthModalType,
  MoneyBoxRelatedTransactionData, SimulatedTransactionForProjection // Added SimulatedTransactionForProjection
} from './types';
import { APP_NAME, getInitialCategories as getSeedCategories, getInitialAccounts as getSeedAccounts, TRANSACTION_TYPE_OPTIONS } from './constants'; // Added TRANSACTION_TYPE_OPTIONS
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
import TagsView from './components/TagsView';
import RecurringTransactionsView from './components/RecurringTransactionsView';
import LoansView from './components/LoansView';
import AICoachView from './components/AICoachView';
import LoginView from './components/LoginView';
import DebtPlannerView from './components/DebtPlannerView';
import CashFlowView from './components/CashFlowView';
import AjudeProjetoView from './components/AjudeProjetoView'; 

// Components
import Modal from './components/Modal';
import TransactionForm from './components/TransactionForm';
import ThemeSwitcher from './components/ThemeSwitcher';
import Button from './components/Button';
import AuthModal from './components/AuthModal';


// Icons
import ChartPieIcon from './components/icons/ChartPieIcon';
import ListBulletIcon from './components/icons/ListBulletIcon';
import CreditCardIcon from './components/icons/CreditCardIcon';
import TagIcon from './components/icons/TagIcon';
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
import BanknotesIcon from './components/icons/BanknotesIcon';
import PresentationChartLineIcon from './components/icons/PresentationChartLineIcon';
import HeartIcon from './components/icons/HeartIcon'; 

// Services
import * as geminiService from './services/geminiService';
import type { FinancialContext } from './services/geminiService'; // Removed SimulatedTransactionData as it's now in types.ts
import { GoogleGenAI, GenerateContentResponse, Chat } from "./google-genai-shim";


const AppContent: React.FC = () => {
  const { addToast } = useToasts();

  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [activeUserProfile, setActiveUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<Record<string, boolean>>({ google: false, email: false, form: false });

  const [authModalType, setAuthModalType] = useState<AuthModalType>('none');
  const [authActionToken, setAuthActionToken] = useState<string | null>(null); // For password reset

  const [currentUserPreferences, setCurrentUserPreferences] = useState<UserPreferences | null>(null);
  const [theme, setThemeState] = useState<Theme>('dark'); 
  const [isPrivacyModeEnabled, setIsPrivacyModeEnabledState] = useState(false);
  const [aiConfig, setAiConfigState] = useState<AIConfig>({
    isEnabled: false,
    apiKeyStatus: 'unknown',
    monthlyIncome: null,
    autoBackupToFileEnabled: false,
  });

  // Data states
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
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true); 
  const [activeView, setActiveView] = useState<AppView>('DASHBOARD');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | Partial<Transaction> | null>(null);


  const isFetchingDataRef = useRef(false);


  const activeUserDisplayName = useMemo(() => {
    return user?.user_metadata?.full_name || user?.email || "Usuário";
  }, [user]);
  
  const userAvatarUrl = useMemo(() => {
    return user?.user_metadata?.avatar_url || null;
  }, [user]);

  const resetAllAppData = () => {
    setTransactions([]); setAccounts([]); setCategories([]); setCreditCards([]);
    setInstallmentPurchases([]); setMoneyBoxes([]); setMoneyBoxTransactions([]);
    setFuturePurchases([]); setTags([]); setRecurringTransactions([]);
    setLoans([]); setLoanRepayments([]); setAiInsights([]);
    setDebts([]); setDebtPayments([]);
    setActiveUserProfile(null);
    setCurrentUserPreferences(null);
    setAiConfigState({ isEnabled: false, apiKeyStatus: 'unknown', monthlyIncome: null, autoBackupToFileEnabled: false });
  };


  const fetchAndSetAllUserData = useCallback(async (authUser: SupabaseUser) => {
    if (isFetchingDataRef.current) {
      console.log("Profile fetch already in progress, skipping.");
      return;
    }
    isFetchingDataRef.current = true;
    setIsLoadingData(true); 
    let userProfile: UserProfile | null = null;

    try {
      const { data: existingUserProfile, error: fetchProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (fetchProfileError && fetchProfileError.code !== 'PGRST116') throw fetchProfileError; 

      if (existingUserProfile) {
        userProfile = existingUserProfile as UserProfile;
      } else {
        const newUserProfileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> = {
          user_id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email || 'Perfil Principal',
        };
        const { data: createdProfile, error: createProfileError } = await supabase
          .from('user_profiles')
          .insert(newUserProfileData)
          .select()
          .single();
        if (createProfileError) throw createProfileError;
        userProfile = createdProfile as UserProfile;
      }
      setActiveUserProfile(userProfile);
      if (!userProfile) throw new Error("Falha ao obter ou criar perfil de usuário.");

      const dbProfileId = userProfile.id; 

      const { data: prefsData, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', authUser.id) 
        .eq('profile_id', dbProfileId)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') throw prefsError;

      if (prefsData) {
        setCurrentUserPreferences(prefsData as UserPreferences);
        setThemeState(prefsData.theme);
        setIsPrivacyModeEnabledState(prefsData.is_privacy_mode_enabled);
        setAiConfigState({
            isEnabled: prefsData.ai_is_enabled,
            monthlyIncome: prefsData.ai_monthly_income,
            autoBackupToFileEnabled: prefsData.ai_auto_backup_enabled,
            apiKeyStatus: geminiService.isGeminiApiKeyAvailable() ? 'available' : 'unavailable',
        });
      } else {
        const defaultPrefs: Omit<UserPreferences, 'created_at' | 'updated_at'> = {
            id: generateClientSideId(), 
            user_id: authUser.id,
            profile_id: dbProfileId, 
            theme: 'dark', is_privacy_mode_enabled: false,
            ai_is_enabled: false, ai_monthly_income: null, ai_auto_backup_enabled: false,
        };
        const { data: newPrefsData, error: insertPrefsError } = await supabase
            .from('user_preferences')
            .insert(defaultPrefs as UserPreferences)
            .select()
            .single();
        if (insertPrefsError) throw insertPrefsError;
        if (newPrefsData) setCurrentUserPreferences(newPrefsData as UserPreferences);
        setThemeState(defaultPrefs.theme);
        setIsPrivacyModeEnabledState(defaultPrefs.is_privacy_mode_enabled);
        setAiConfigState({
            isEnabled: defaultPrefs.ai_is_enabled,
            monthlyIncome: defaultPrefs.ai_monthly_income,
            autoBackupToFileEnabled: defaultPrefs.ai_auto_backup_enabled,
            apiKeyStatus: geminiService.isGeminiApiKeyAvailable() ? 'available' : 'unavailable',
        });
      }
      
      const dataFilter = (query: any) => query.eq('user_id', authUser.id).eq('profile_id', dbProfileId);

      const [
          transactionsRes, accountsRes, categoriesRes, creditCardsRes, installmentPurchasesRes,
          moneyBoxesRes, moneyBoxTransactionsRes, futurePurchasesRes, tagsRes,
          recurringTransactionsRes, loansRes, loanRepaymentsRes, aiInsightsRes,
          debtsRes, debtPaymentsRes
      ] = await Promise.all([
          dataFilter(supabase.from('transactions').select('*')).order('date', { ascending: false }),
          dataFilter(supabase.from('accounts').select('*')).order('name'),
          dataFilter(supabase.from('categories').select('*')).order('name'),
          dataFilter(supabase.from('credit_cards').select('*')).order('name'),
          dataFilter(supabase.from('installment_purchases').select('*')).order('purchase_date', { ascending: false }),
          dataFilter(supabase.from('money_boxes').select('*')).order('name'),
          dataFilter(supabase.from('money_box_transactions').select('*')).order('date', { ascending: false }),
          dataFilter(supabase.from('future_purchases').select('*')).order('created_at', { ascending: false }),
          dataFilter(supabase.from('tags').select('*')).order('name'),
          dataFilter(supabase.from('recurring_transactions').select('*')).order('next_due_date'),
          dataFilter(supabase.from('loans').select('*')).order('loan_date', { ascending: false }),
          dataFilter(supabase.from('loan_repayments').select('*')).order('repayment_date', { ascending: false }),
          dataFilter(supabase.from('ai_insights').select('*')).order('timestamp', { ascending: false }),
          dataFilter(supabase.from('debts').select('*')).order('created_at', { ascending: false }),
          dataFilter(supabase.from('debt_payments').select('*')).order('payment_date', { ascending: false }),
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
      if (debtsRes.error) throw debtsRes.error; setDebts(debtsRes.data as Debt[]);
      if (debtPaymentsRes.error) throw debtPaymentsRes.error; setDebtPayments(debtPaymentsRes.data as DebtPayment[]);
      
      if (accountsRes.data?.length === 0) {
          const seedAccs = getSeedAccounts(authUser.id, dbProfileId).map(acc => ({ ...acc, user_id: authUser.id, profile_id: dbProfileId }));
          const { data: newAccs, error: seedAccError } = await supabase.from('accounts').insert(seedAccs).select();
          if (seedAccError) throw seedAccError;
          if (newAccs) setAccounts(newAccs as Account[]);
      }
      if (categoriesRes.data?.length === 0) {
          const seedCats = getSeedCategories(authUser.id, dbProfileId).map(cat => ({ ...cat, user_id: authUser.id, profile_id: dbProfileId }));
          const { data: newCats, error: seedCatError } = await supabase.from('categories').insert(seedCats).select();
          if (seedCatError) throw seedCatError;
          if (newCats) setCategories(newCats as Category[]);
      }
      setActiveView('DASHBOARD');

    } catch (error: any) {
        console.error("Error fetching user data:", error);
        addToast(`Erro ao carregar dados: ${error.message || 'TypeError: Failed to fetch'}`, 'error');
        setActiveUserProfile(null); 
        setCurrentUserPreferences(null);
    } finally {
        setIsLoadingData(false);
        isFetchingDataRef.current = false;
    }
  }, [addToast]);


  useEffect(() => {
    setIsLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      setIsLoadingSession(false); 

      if (currentUser) {
        fetchAndSetAllUserData(currentUser);
      } else {
        setIsLoadingData(false); 
        setActiveView('LOGIN');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        const oldUserId = user?.id;
        setSession(newSession);
        const newAuthUser = newSession?.user ?? null;
        setUser(newAuthUser);
        setAuthActionToken(newSession?.access_token || null);

        if (newAuthUser?.id !== oldUserId) { 
            resetAllAppData();
            if (newAuthUser) { 
                fetchAndSetAllUserData(newAuthUser);
            } else { 
                setIsLoadingData(false);
                setActiveView('LOGIN');
                if (event === 'SIGNED_OUT') addToast("Você foi desconectado.", 'info');
            }
        } else if (newAuthUser && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
            if (!activeUserProfile && !isFetchingDataRef.current) {
                fetchAndSetAllUserData(newAuthUser);
            }
        } else if (event === 'PASSWORD_RECOVERY') {
            setAuthModalType('resetPassword');
            addToast("Siga as instruções para definir uma nova senha.", "info");
        }
        setIsLoadingSession(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [fetchAndSetAllUserData, addToast, user?.id, activeUserProfile]);


  const updateUserPreference = useCallback(async (key: keyof Omit<UserPreferences, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>, value: any) => {
      if (!user || !activeUserProfile) return;
      const { error } = await supabase
        .from('user_preferences')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('profile_id', activeUserProfile.id);
      if (error) {
        console.error(`Error updating user preference ${key}:`, error);
        addToast(`Erro ao salvar preferência (${key}): ${error.message}`, 'error');
      } else {
         setCurrentUserPreferences(prev => prev ? ({ ...prev, [key]: value, updated_at: new Date().toISOString() }) : null);
      }
  }, [user, activeUserProfile, addToast]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (user && activeUserProfile) updateUserPreference('theme', newTheme);
  }, [user, activeUserProfile, updateUserPreference]);

  const togglePrivacyMode = useCallback(() => {
    const newPrivacyModeState = !isPrivacyModeEnabled;
    setIsPrivacyModeEnabledState(newPrivacyModeState);
    if (user && activeUserProfile) updateUserPreference('is_privacy_mode_enabled', newPrivacyModeState);
  }, [isPrivacyModeEnabled, user, activeUserProfile, updateUserPreference]);

  const updateAiConfig = useCallback((newConfig: Partial<Omit<AIConfig, 'apiKeyStatus'>>) => {
    if (!user || !activeUserProfile) return;

    const updatedConfigFields: Partial<Pick<UserPreferences, 'ai_is_enabled' | 'ai_monthly_income' | 'ai_auto_backup_enabled'>> = {};
    if (newConfig.isEnabled !== undefined) updatedConfigFields.ai_is_enabled = newConfig.isEnabled;
    if (newConfig.monthlyIncome !== undefined) updatedConfigFields.ai_monthly_income = newConfig.monthlyIncome;
    if (newConfig.autoBackupToFileEnabled !== undefined) updatedConfigFields.ai_auto_backup_enabled = newConfig.autoBackupToFileEnabled;

    setAiConfigState(prev => ({...prev, ...newConfig}));

    if (Object.keys(updatedConfigFields).length > 0) {
         supabase.from('user_preferences')
            .update({...updatedConfigFields, updated_at: new Date().toISOString()})
            .eq('user_id', user.id)
            .eq('profile_id', activeUserProfile.id)
            .then(({ error }) => {
                 if (error) {
                    console.error('Error updating AI config in preferences:', error);
                    addToast(`Erro ao salvar configurações da IA: ${error.message}`, 'error');
                } else {
                    setCurrentUserPreferences(prev => prev ? ({...prev, ...updatedConfigFields, updated_at: new Date().toISOString()}) : null);
                }
            });
    }
  }, [user, activeUserProfile, addToast]);

  useEffect(() => {
    const applyThemeToDocument = (currentTheme: Theme) => {
      if (currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
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
    setAuthLoading(prev => ({ ...prev, google: true }));
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${ (import.meta as any).env.BASE_URL || '/'}`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      setAuthError(error.message || "Falha ao fazer login com Google.");
      addToast(error.message || "Falha ao fazer login com Google.", 'error');
    } finally {
      setAuthLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handleSignInWithEmail = async (email: string, password: string): Promise<void> => {
    setAuthLoading(prev => ({ ...prev, email: true }));
    setAuthError(null);
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        addToast("Login bem-sucedido!", 'success');
        // onAuthStateChange will handle setting user and fetching data
    } catch (error: any) {
        console.error("Error signing in with email:", error);
        setAuthError(error.message || "Email ou senha inválidos.");
        // No need for addToast here, authError is displayed in LoginView
        throw error; // Rethrow to allow LoginView to handle its specific loading state
    } finally {
        setAuthLoading(prev => ({ ...prev, email: false }));
    }
  };

  const handleSignUpWithEmail = async (fullName: string, email: string, password: string): Promise<void> => {
    setAuthLoading(prev => ({ ...prev, form: true }));
    setAuthError(null);
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          // This typically means email confirmation is required.
          addToast("Cadastro quase completo! Verifique seu e-mail para confirmar sua conta.", 'info', 10000);
        } else {
          addToast("Cadastro realizado com sucesso!", 'success');
        }
        // onAuthStateChange will handle user state
    } catch (error: any) {
        console.error("Error signing up:", error);
        setAuthError(error.message || "Erro ao cadastrar. Tente novamente.");
        throw error;
    } finally {
        setAuthLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleSendPasswordResetEmail = async (email: string): Promise<void> => {
    setAuthLoading(prev => ({ ...prev, form: true }));
    setAuthError(null);
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}${(import.meta as any).env.BASE_URL || '/'}`, // Supabase will append reset tokens
        });
        if (error) throw error;
        addToast("Link de recuperação enviado! Verifique seu e-mail.", 'info', 10000);
    } catch (error: any) {
        console.error("Error sending password reset email:", error);
        setAuthError(error.message || "Erro ao enviar email de recuperação.");
        throw error;
    } finally {
        setAuthLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleUpdateUserPassword = async (newPassword: string): Promise<void> => {
    setAuthLoading(prev => ({ ...prev, form: true }));
    setAuthError(null);
    if (!authActionToken) { // Should not happen if UI flow is correct
        setAuthError("Token de redefinição de senha ausente ou inválido.");
        addToast("Token de redefinição ausente. Por favor, tente o processo de recuperação novamente.", "error");
        setAuthLoading(prev => ({ ...prev, form: false }));
        throw new Error("Token de redefinição de senha ausente ou inválido.");
    }
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        addToast("Senha alterada com sucesso! Você pode fazer login com sua nova senha.", 'success');
        setAuthModalType('none'); 
        setAuthActionToken(null);
    } catch (error: any) {
        console.error("Error updating password:", error);
        setAuthError(error.message || "Erro ao atualizar senha.");
        throw error;
    } finally {
        setAuthLoading(prev => ({ ...prev, form: false }));
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
    if (!user || !activeUserProfile) return 0;
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
  }, [accounts, transactions, user, activeUserProfile]);

  const calculateMoneyBoxBalance = useCallback((moneyBoxId: string): number => {
    if (!user || !activeUserProfile) return 0;
    return moneyBoxTransactions.reduce((balance, mbt) => {
      if (mbt.money_box_id === moneyBoxId) {
        if (mbt.type === MoneyBoxTransactionType.DEPOSIT) return balance + mbt.amount;
        if (mbt.type === MoneyBoxTransactionType.WITHDRAWAL) return balance - mbt.amount;
      }
      return balance;
    }, 0);
  }, [moneyBoxTransactions, user, activeUserProfile]);
  
  const generateFinancialContext = useCallback((simulatedTx?: SimulatedTransactionForProjection): FinancialContext | null => {
    if (!user || !activeUserProfile) return null;
    const currentDateObj = new Date();
    const currentDate = getISODateString(currentDateObj);
    const dayOfMonth = currentDateObj.getDate();
    const currentYear = currentDateObj.getFullYear();
    const currentMonth = currentDateObj.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let effectiveTransactions = [...transactions];
    if (simulatedTx) {
        const tempSimulatedTx: Transaction = {
            id: `simulated-${generateClientSideId()}`,
            user_id: user.id,
            profile_id: activeUserProfile.id, 
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            type: simulatedTx.type,
            amount: simulatedTx.amount,
            date: simulatedTx.date,
            description: simulatedTx.description,
            account_id: 'simulated_account',
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
        currentDate, dayOfMonth, daysInMonth,
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
        simulatedTransactionData: simulatedTx,
        debts: debts,
    };
  }, [user, activeUserProfile, accounts, transactions, categories, moneyBoxes, moneyBoxTransactions, loans, loanRepayments, recurringTransactions, futurePurchases, theme, aiConfig.monthlyIncome, debts, calculateAccountBalance, calculateMoneyBoxBalance]);


  const addOrUpdateRecord = async <T extends { id?: string, user_id?: string, profile_id?: string, created_at?: string, updated_at?: string }>(
    table: string,
    record: Omit<T, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | T,
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    sortFn?: (a: T, b: T) => number,
    isUpdate: boolean = false
  ): Promise<T | null> => {
    if (!user || !activeUserProfile) return null;
    
    const payloadBase = { ...record, user_id: user.id, profile_id: activeUserProfile.id };
    
    let response;
    if (isUpdate && (record as T).id) {
        const payload = { ...payloadBase, updated_at: new Date().toISOString() };
        response = await supabase.from(table).update(payload).eq('id', (record as T).id!).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    } else {
        const payload = { ...payloadBase, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        response = await supabase.from(table).insert(payload).select().single();
    }

    if (response.error) {
        addToast(`Erro ao ${isUpdate ? 'atualizar' : 'adicionar'} ${table}: ${response.error.message}`, 'error');
        return null;
    }
    if (response.data) {
        const newRecord = response.data as T;
        setter(prev => {
            const filtered = isUpdate ? prev.filter(item => item.id !== newRecord.id) : prev;
            const newItems = [...filtered, newRecord];
            return sortFn ? newItems.sort(sortFn) : newItems;
        });
        // Toast for MoneyBoxTransaction is handled specifically where it's called.
        if (table !== 'money_box_transactions' && table !== 'ai_insights') { // Also exclude ai_insights from generic toast
             addToast(`${isUpdate ? 'Atualizado' : 'Adicionado'} com sucesso!`, 'success');
        }
        return newRecord;
    }
    return null;
  };

  const deleteRecord = async (table: string, id: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    if (!user || !activeUserProfile) return;
    const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
    if (error) { addToast(`Erro ao excluir de ${table}: ${error.message}`, 'error'); }
    else {
        setter(prev => prev.filter(item => item.id !== id));
        addToast('Excluído com sucesso!', 'success');
    }
  };


  // Transaction Handlers
  const handleAddOrUpdateTransaction = async (
    data: Transaction | Omit<Transaction, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | MoneyBoxRelatedTransactionData
  ) => {
    if (!user || !activeUserProfile) return;

    let mainTransaction: Transaction | null = null;
    const isUpdate = 'id' in data && !!data.id;

    if ('isMoneyBoxTransaction' in data && data.isMoneyBoxTransaction) {
        // Handle MoneyBox related transaction
        const { moneyBoxId, backingAccountId, id: existingMainTxId, ...mainTxBaseData } = data;
        
        const mainTxForDb: Omit<Transaction, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | Transaction = {
            ...mainTxBaseData,
            account_id: backingAccountId, // Use the real backing account for the main transaction
            // Ensure category_id is set or undefined, not empty string if it came from form
            category_id: mainTxBaseData.category_id || undefined,
        };
        if (existingMainTxId) (mainTxForDb as Transaction).id = existingMainTxId;


        mainTransaction = await addOrUpdateRecord<Transaction>(
            'transactions',
            mainTxForDb,
            setTransactions,
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            !!existingMainTxId 
        );

        if (mainTransaction) {
            const mbtData: Omit<MoneyBoxTransaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
                money_box_id: moneyBoxId,
                type: mainTransaction.type === TransactionType.INCOME ? MoneyBoxTransactionType.DEPOSIT : MoneyBoxTransactionType.WITHDRAWAL,
                amount: mainTransaction.amount,
                date: mainTransaction.date,
                description: `Movimentação de ${mainTransaction.type === TransactionType.INCOME ? 'entrada' : 'saída'} via formulário: ${mainTransaction.description || categories.find(c=>c.id === mainTransaction.category_id)?.name || ''}`,
                linked_transaction_id: mainTransaction.id,
            };
            if (!existingMainTxId) { 
                 await addOrUpdateRecord<MoneyBoxTransaction>(
                    'money_box_transactions',
                    mbtData,
                    setMoneyBoxTransactions,
                    (a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
            }
             addToast('Transação principal e da caixinha registradas!', 'success');
        }
    } else {
        // Handle regular transaction
        const regularTxData = data as Transaction | Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>;
        mainTransaction = await addOrUpdateRecord<Transaction>(
            'transactions',
            regularTxData,
            setTransactions,
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            isUpdate
        );
    }

    if (mainTransaction) {
        setIsTransactionModalOpen(false);
        setEditingTransaction(null);
        if (mainTransaction.type !== TransactionType.TRANSFER) { // AI comments not for transfers
            handleGenerateCommentForTransaction(mainTransaction);
            handleAnalyzeSpendingForCategory(mainTransaction);
        }

        // Special handling for credit card expenses not linked to installment purchases (direct debits)
        const isCreditCardSource = creditCards.some(cc => cc.id === mainTransaction!.account_id);
        const isAlreadyInstallment = installmentPurchases.some(ip => ip.linked_transaction_id === mainTransaction!.id);

        if (isCreditCardSource && mainTransaction!.type === TransactionType.EXPENSE && !isAlreadyInstallment && !('isMoneyBoxTransaction' in data && data.isMoneyBoxTransaction)) {
            const originalTransaction = isUpdate ? transactions.find(t => t.id === mainTransaction!.id) : null;
            const becameCardDebit = isUpdate && originalTransaction && !creditCards.some(cc => cc.id === originalTransaction.account_id) && isCreditCardSource;

            if (!isUpdate || becameCardDebit) { 
                const installmentPurchaseData: Omit<InstallmentPurchase, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
                    credit_card_id: mainTransaction!.account_id,
                    description: `Débito Direto: ${mainTransaction!.description || categories.find(c=>c.id === mainTransaction!.category_id)?.name || 'Despesa no Cartão'}`,
                    purchase_date: mainTransaction!.date,
                    total_amount: mainTransaction!.amount,
                    number_of_installments: 1, 
                    installments_paid: 0, 
                    linked_transaction_id: mainTransaction!.id,
                };
                await handleAddInstallmentPurchase(installmentPurchaseData, false); 
            }
        }
    }
  };
  const handleDeleteTransaction = (id: string) => deleteRecord('transactions', id, setTransactions);
  
  // Account Handlers
  const handleAddAccount = (data: Omit<Account, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => addOrUpdateRecord('accounts', data, setAccounts, (a: Account,b: Account) => a.name.localeCompare(b.name));
  const handleUpdateAccount = (data: Account) => addOrUpdateRecord('accounts', data, setAccounts, (a: Account,b: Account) => a.name.localeCompare(b.name), true);
  const handleDeleteAccount = (id: string) => {
    const isUsedInRecurring = recurringTransactions.some(rt => rt.account_id === id || rt.to_account_id === id);
    if (isUsedInRecurring) {
        addToast('Não é possível excluir. Esta conta está sendo usada em transações recorrentes.', 'error');
        return;
    }
    if (window.confirm('Excluir esta conta? Todas as transações associadas permanecerão, mas podem ficar órfãs se não houver mais contas.')) {
      deleteRecord('accounts', id, setAccounts);
    }
  };

  // Category Handlers
  const handleAddCategory = (data: Omit<Category, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => addOrUpdateRecord('categories', data, setCategories, (a: Category,b: Category) => a.name.localeCompare(b.name));
  const handleUpdateCategory = (data: Category) => addOrUpdateRecord('categories', data, setCategories, (a: Category,b: Category) => a.name.localeCompare(b.name), true);
  const handleDeleteCategory = (id: string) => { if (window.confirm('Excluir esta categoria?')) deleteRecord('categories', id, setCategories); };
  
  // Credit Card Handlers
  const handleAddCreditCard = (data: Omit<CreditCard, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>) => addOrUpdateRecord('credit_cards', data, setCreditCards, (a: CreditCard,b: CreditCard) => a.name.localeCompare(b.name));
  const handleUpdateCreditCard = (data: CreditCard) => addOrUpdateRecord('credit_cards', data, setCreditCards, (a: CreditCard,b: CreditCard) => a.name.localeCompare(b.name), true);
  const handleDeleteCreditCard = (id: string) => {
    const isUsedInRecurring = recurringTransactions.some(rt => rt.account_id === id);
    if (isUsedInRecurring) {
        addToast('Não é possível excluir. Este cartão de crédito está sendo usado em transações recorrentes.', 'error');
        return;
    }
    if (window.confirm('Excluir este cartão? Compras parceladas associadas não serão excluídas.')) {
        deleteRecord('credit_cards', id, setCreditCards);
    }
  };

  // Installment Purchase Handlers
  const handleAddInstallmentPurchase = async (purchase: Omit<InstallmentPurchase, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>, showToast = true) => {
    await addOrUpdateRecord('installment_purchases', purchase, setInstallmentPurchases, (a: InstallmentPurchase, b: InstallmentPurchase) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
  };
  const handleUpdateInstallmentPurchase = async (updatedPurchase: InstallmentPurchase, showToast = true) => {
    await addOrUpdateRecord('installment_purchases', updatedPurchase, setInstallmentPurchases, (a: InstallmentPurchase, b: InstallmentPurchase) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime(), true);
  };
  const handleDeleteInstallmentPurchase = async (purchaseId: string, cascadeDeleteTransaction = true) => {
    if (!user || !activeUserProfile) return;
    const purchaseToDelete = installmentPurchases.find(ip => ip.id === purchaseId);
    if (purchaseToDelete?.linked_transaction_id && purchaseToDelete.number_of_installments === 1 && cascadeDeleteTransaction) {
        await supabase.from('transactions').delete().eq('id', purchaseToDelete.linked_transaction_id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
    }
    deleteRecord('installment_purchases', purchaseId, setInstallmentPurchases);
  };
   const handleMarkInstallmentPaid = async (purchaseId: string) => {
    const purchase = installmentPurchases.find(p => p.id === purchaseId);
    if (!purchase || !user || !activeUserProfile) return;
    if (purchase.installments_paid < purchase.number_of_installments) {
      const updatedPurchase = { ...purchase, installments_paid: purchase.installments_paid + 1 };
      await handleUpdateInstallmentPurchase(updatedPurchase);
    }
  };
  const handlePayMonthlyInstallments = async (cardId: string): Promise<void> => {
    if (!user || !activeUserProfile) return;
    const eligible = getEligibleInstallmentsForBillingCycle(installmentPurchases.filter(p => p.credit_card_id === cardId), creditCards.find(c => c.id === cardId)!, new Date());

    const updates = eligible.map(p => {
      const updatedPurchase = { ...p, installments_paid: p.installments_paid + 1, updated_at: new Date().toISOString() };
      return supabase
        .from('installment_purchases')
        .update({ installments_paid: updatedPurchase.installments_paid, updated_at: updatedPurchase.updated_at })
        .eq('id', p.id)
        .eq('user_id', user.id)
        .eq('profile_id', activeUserProfile.id)
        .select()
        .single();
    });
    const results = await Promise.all(updates);
    const successfulUpdates = results.filter(res => res.data).map(res => res.data as InstallmentPurchase);
    if (successfulUpdates.length > 0) {
      setInstallmentPurchases(prev =>
        prev.map(ip => successfulUpdates.find(s => s.id === ip.id) || ip)
          .sort((a,b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
      );
      addToast(`${successfulUpdates.length} parcela(s) da fatura marcada(s) como paga(s)!`, 'success');
    }
    results.filter(res => res.error).forEach(res => addToast(`Erro ao pagar parcela: ${res.error?.message}`, 'error'));
  };
  
  // MoneyBox Handlers
  const handleAddMoneyBox = (data: Omit<MoneyBox, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>) => addOrUpdateRecord('money_boxes', data, setMoneyBoxes, (a: MoneyBox,b: MoneyBox) => a.name.localeCompare(b.name));
  const handleUpdateMoneyBox = (data: MoneyBox) => addOrUpdateRecord('money_boxes', data, setMoneyBoxes, (a: MoneyBox,b: MoneyBox) => a.name.localeCompare(b.name), true);
  const handleDeleteMoneyBox = (id: string) => { if (window.confirm('Excluir esta caixinha?')) deleteRecord('money_boxes', id, setMoneyBoxes);};
  
  const handleAddMoneyBoxTransaction = async (mbt: Omit<MoneyBoxTransaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'|'linked_transaction_id'>, createLinkedTransaction: boolean, linkedAccId?: string) => {
    if (!user || !activeUserProfile) return;
    let linkedTxId: string | undefined = undefined;

    if (createLinkedTransaction && linkedAccId) {
        const mainTxData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            type: mbt.type === MoneyBoxTransactionType.DEPOSIT ? TransactionType.EXPENSE : TransactionType.INCOME,
            amount: mbt.amount,
            date: mbt.date,
            description: `${mbt.type === MoneyBoxTransactionType.DEPOSIT ? 'Depósito' : 'Saque'} Caixinha: ${moneyBoxes.find(mb => mb.id === mbt.money_box_id)?.name || 'N/A'} ${mbt.description ? `- ${mbt.description}` : ''}`,
            account_id: linkedAccId,
            category_id: '', 
        };

        if (mainTxData.type === TransactionType.INCOME) { 
            let incomeCategoryId = categories.find(c => c.type === TransactionType.INCOME && c.name.toLowerCase().includes("outras receitas"))?.id;
            if (!incomeCategoryId) incomeCategoryId = categories.find(c => c.type === TransactionType.INCOME)?.id;
            
            if (!incomeCategoryId) {
                addToast("Nenhuma categoria de receita encontrada para vincular a movimentação da caixinha.", "error");
                return; 
            }
            mainTxData.category_id = incomeCategoryId;
        } else { 
            let expenseCategoryId = categories.find(c => c.type === TransactionType.EXPENSE && (c.name.toLowerCase().includes("caixinha") || c.name.toLowerCase().includes("investimento") || c.name.toLowerCase().includes("poupança")) )?.id;
            if (!expenseCategoryId) expenseCategoryId = categories.find(c => c.type === TransactionType.EXPENSE && c.name.toLowerCase().includes("outras despesas"))?.id;
            if (!expenseCategoryId) expenseCategoryId = categories.find(c => c.type === TransactionType.EXPENSE)?.id;

            if (!expenseCategoryId) {
                addToast("Nenhuma categoria de despesa encontrada para vincular o depósito na caixinha.", "error");
                return;
            }
            mainTxData.category_id = expenseCategoryId;
        }
        
        const mainTx = await addOrUpdateRecord('transactions', mainTxData, setTransactions, (a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime());
        if(!mainTx) { addToast(`Erro ao criar transação principal para caixinha.`, 'error'); return; }
        linkedTxId = mainTx.id;
    }
    await addOrUpdateRecord('money_box_transactions', {...mbt, linked_transaction_id: linkedTxId} as Omit<MoneyBoxTransaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>, setMoneyBoxTransactions, (a: MoneyBoxTransaction,b: MoneyBoxTransaction)=>new Date(b.date).getTime() - new Date(a.date).getTime());
    addToast(`Movimentação na caixinha "${moneyBoxes.find(mb => mb.id === mbt.money_box_id)?.name}" registrada!`, 'success');
  };
  const handleDeleteMoneyBoxTransaction = (id: string, linkedTransactionId?:string) => {
      if(linkedTransactionId && window.confirm("Esta transação de caixinha está vinculada a uma transação principal. Deseja remover APENAS a movimentação da caixinha? A transação principal NÃO será afetada.")){
        deleteRecord('money_box_transactions', id, setMoneyBoxTransactions);
      } else if (!linkedTransactionId){
        deleteRecord('money_box_transactions', id, setMoneyBoxTransactions);
      }
  };
  
  // Tag Handlers
  const handleAddTag = (data: Omit<Tag, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>) => addOrUpdateRecord('tags', data, setTags, (a: Tag,b: Tag) => a.name.localeCompare(b.name));
  const handleUpdateTag = (data: Tag) => addOrUpdateRecord('tags', data, setTags, (a: Tag,b: Tag) => a.name.localeCompare(b.name), true);
  const handleDeleteTag = (id: string) => { if (window.confirm('Excluir esta tag?')) deleteRecord('tags', id, setTags); };
  
  // Recurring Transaction Handlers
  const handleAddRecurringTransaction = (data: Omit<RecurringTransaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>) => addOrUpdateRecord('recurring_transactions', data, setRecurringTransactions, (a: RecurringTransaction,b: RecurringTransaction) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
  const handleUpdateRecurringTransaction = (data: RecurringTransaction) => addOrUpdateRecord('recurring_transactions', data, setRecurringTransactions, (a: RecurringTransaction,b: RecurringTransaction) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime(), true);
  const handleDeleteRecurringTransaction = (id: string) => { if (window.confirm('Excluir esta recorrência?')) deleteRecord('recurring_transactions', id, setRecurringTransactions); };
  const handleProcessRecurringTransactions = async (): Promise<{ count: number; errors: string[] }> => {
    if (!user || !activeUserProfile) return { count: 0, errors: ["Usuário não ativo."]};
    const toProcess = recurringTransactions.filter(rt => !rt.is_paused && new Date(rt.next_due_date) <= new Date() && (rt.remaining_occurrences === undefined || rt.remaining_occurrences > 0));
    let count = 0;
    const errors: string[] = [];

    for (const rt of toProcess) {
        const transactionData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            type: rt.type, amount: rt.amount, category_id: rt.category_id,
            description: `Recorrência: ${rt.description}`, date: rt.next_due_date,
            account_id: rt.account_id, to_account_id: rt.to_account_id,
        };
        await handleAddOrUpdateTransaction(transactionData); 

        const updatedRTData = {
            last_posted_date: rt.next_due_date,
            next_due_date: geminiService.calculateNextDueDate(rt.next_due_date, rt.frequency, rt.custom_interval_days),
            remaining_occurrences: rt.remaining_occurrences !== undefined ? rt.remaining_occurrences -1 : undefined,
        };
        const {error: updateError} = await supabase.from('recurring_transactions').update(updatedRTData).eq('id', rt.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
        if(updateError) errors.push(`Erro ao atualizar ${rt.description}: ${updateError.message}`);
        else count++;
    }
    if (user && activeUserProfile) { 
        const { data, error } = await supabase.from('recurring_transactions').select('*').eq('user_id', user.id).eq('profile_id', activeUserProfile.id).order('next_due_date');
        if (error) addToast("Erro ao recarregar recorrências.", "error");
        else if (data) setRecurringTransactions(data as RecurringTransaction[]);
    }
    return { count, errors };
  };
  
  // Loan Handlers
  const handleAddLoan = async (loanData: Omit<Loan, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'|'linked_expense_transaction_id'|'linked_installment_purchase_id'>, ccInstallmentsFromForm?: number) => {
    if (!user || !activeUserProfile) return;
    let linkedExpenseTxId: string | undefined = undefined;
    if (loanData.funding_source === 'account' && loanData.amount_delivered_from_account && loanData.linked_account_id) {
        const expenseTxData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            type: TransactionType.EXPENSE, amount: loanData.amount_delivered_from_account, date: loanData.loan_date,
            description: `Empréstimo para ${loanData.person_name}`, account_id: loanData.linked_account_id,
        };
        const expenseTx = await addOrUpdateRecord('transactions', expenseTxData, setTransactions, (a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if(!expenseTx) { addToast(`Erro ao criar transação de despesa para empréstimo.`, 'error'); return; }
        linkedExpenseTxId = expenseTx.id;
    }
    let linkedInstallmentPurchaseId: string | undefined = undefined;
    if (loanData.funding_source === 'creditCard' && loanData.cost_on_credit_card && loanData.linked_credit_card_id && ccInstallmentsFromForm) {
        const ipData: Omit<InstallmentPurchase, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            credit_card_id: loanData.linked_credit_card_id, description: `Empréstimo (crédito) para ${loanData.person_name}`,
            purchase_date: loanData.loan_date, total_amount: loanData.cost_on_credit_card,
            number_of_installments: ccInstallmentsFromForm, installments_paid: 0,
        };
        const newIp = await addOrUpdateRecord('installment_purchases', ipData, setInstallmentPurchases, (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
        if(!newIp) {addToast(`Erro ao criar compra parcelada para empréstimo.`, 'error'); return;}
        linkedInstallmentPurchaseId = newIp.id;
    }
    const finalLoanData = { ...loanData, linked_expense_transaction_id: linkedExpenseTxId, linked_installment_purchase_id: linkedInstallmentPurchaseId };
    await addOrUpdateRecord('loans', finalLoanData as Omit<Loan, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>, setLoans, (a: Loan,b: Loan)=> new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime());
  };
  const handleUpdateLoan = (data: Loan) => addOrUpdateRecord('loans', data, setLoans, (a: Loan,b: Loan)=> new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime(), true);
  const handleDeleteLoan = async (loanId: string) => {
    if (!user || !activeUserProfile) return;
    const loanToDelete = loans.find(l => l.id === loanId);
    if (loanToDelete) {
        if (loanToDelete.linked_expense_transaction_id) await supabase.from('transactions').delete().eq('id', loanToDelete.linked_expense_transaction_id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
        if (loanToDelete.linked_installment_purchase_id) await supabase.from('installment_purchases').delete().eq('id', loanToDelete.linked_installment_purchase_id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
    }
    await deleteRecord('loans', loanId, setLoans);
    setLoanRepayments(prev => prev.filter(rp => rp.loan_id !== loanId));
  };

  // LoanRepayment Handlers
  const handleAddLoanRepayment = async (repaymentData: Omit<LoanRepayment, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'|'linked_income_transaction_id'|'loan_id'>, loanId: string) => {
    if(!user || !activeUserProfile) return;
    const incomeTxData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
        type: TransactionType.INCOME, amount: repaymentData.amount_paid, date: repaymentData.repayment_date,
        description: `Recebimento de empréstimo de ${loans.find(l=>l.id === loanId)?.person_name || 'N/A'}`,
        account_id: repaymentData.credited_account_id,
    };
    const incomeTx = await addOrUpdateRecord('transactions', incomeTxData, setTransactions, (a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if(!incomeTx) { addToast(`Erro ao criar transação de receita para pagamento de empréstimo.`, 'error'); return;}
    
    await addOrUpdateRecord('loan_repayments', { ...repaymentData, loan_id: loanId, linked_income_transaction_id: incomeTx.id } as Omit<LoanRepayment, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>, setLoanRepayments, (a: LoanRepayment,b: LoanRepayment)=>new Date(b.repayment_date).getTime() - new Date(a.repayment_date).getTime());
  };

  // AI Insight Handlers
  const handleAddAIInsight = async (insightData: Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'isLoading'>) => {
    const newInsight = await addOrUpdateRecord(
        'ai_insights', 
        insightData, 
        setAiInsights,
        (a: AIInsight,b: AIInsight) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (newInsight) {
      if (newInsight.type === 'error_message') {
        addToast(`${newInsight.content}`, 'error', 7000);
      } else {
        addToast(`${newInsight.content}`, 'info', 7000);
      }
    }
    return newInsight;
  };
  const handleDeleteAllAIInsights = async () => {
    if (!user || !activeUserProfile) {
        addToast("Usuário não autenticado.", 'error');
        return;
    }
    if (!window.confirm("Tem certeza que deseja limpar TODO o histórico de insights do AI Coach? Esta ação não pode ser desfeita.")) {
        return;
    }
    try {
        const { error } = await supabase
            .from('ai_insights')
            .delete()
            .eq('user_id', user.id)
            .eq('profile_id', activeUserProfile.id);

        if (error) throw error;

        setAiInsights([]);
        addToast("Histórico de insights do AI Coach foi limpo.", 'success');
    } catch (error: any) {
        addToast(`Erro ao limpar histórico de insights: ${error.message}`, 'error');
        console.error("Error deleting all AI insights:", error);
    }
  };

  const handleUpdateAIInsight = (updatedInsight: AIInsight) => {
    addOrUpdateRecord('ai_insights', {...updatedInsight, isLoading: undefined}, setAiInsights, (a: AIInsight,b: AIInsight) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(), true);
  };
  
  const handleFetchGeneralAdvice = async () => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (context) {
        const insight = await geminiService.fetchGeneralAdvice(context);
        if (insight) handleAddAIInsight(insight);
    }
  };

  const handleGenerateCommentForTransaction = async (transaction: Transaction) => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;
    const account = accounts.find(a => a.id === transaction.account_id);
    const category = categories.find(c => c.id === transaction.category_id);
    const insightData = await geminiService.fetchCommentForTransaction(transaction, context, category?.name, account?.name);
    if (insightData) handleAddAIInsight(insightData);
  };

  const handleSuggestBudgetForCategory = async (categoryName: string, currentBudgets: {name: string, budget?: number}[]): Promise<number | null> => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available' || !aiConfig.monthlyIncome) {
      addToast("AI Coach ou renda mensal não configurados para sugestão de orçamento.", 'warning');
      return null;
    }
    const context = generateFinancialContext();
    if (!context) return null;

    const result = await geminiService.fetchBudgetSuggestion(categoryName, aiConfig.monthlyIncome, currentBudgets, context);
    if (result && 'suggestedBudget' in result) {
      addToast(`AI Coach sugeriu um orçamento de ${formatCurrency(result.suggestedBudget)} para ${categoryName}.`, 'info');
      return result.suggestedBudget;
    } else if (result) { 
        handleAddAIInsight(result as Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>);
    }
    return null;
  };
  
  const handleAnalyzeSpendingForCategory = async (transaction: Transaction) => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available' || !transaction.category_id || transaction.type !== TransactionType.EXPENSE) return;
    const context = generateFinancialContext();
    if (!context) return;

    const category = categories.find(c => c.id === transaction.category_id);
    if (!category) return;

    const recentCategoryTxs = transactions.filter(t => t.category_id === category.id && t.type === TransactionType.EXPENSE && t.id !== transaction.id).slice(0,20);
    if (recentCategoryTxs.length > 3) { 
        const unusualTxInsight = await geminiService.fetchUnusualTransactionInsight(transaction, category.name, recentCategoryTxs, context);
        if(unusualTxInsight) handleAddAIInsight(unusualTxInsight);
    }
    
    if (category.monthly_budget && category.monthly_budget > 0) {
        const currentMonth = getISODateString().substring(0, 7);
        const monthlySpending = transactions
            .filter(t => t.category_id === category.id && t.date.startsWith(currentMonth) && t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);

        const dayOfMonth = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const proRataBudget = (category.monthly_budget / daysInMonth) * dayOfMonth;
        const daysRemaining = daysInMonth - dayOfMonth;
        const dailySpendingRate = monthlySpending / dayOfMonth;
        const projectedSpend = monthlySpending + (dailySpendingRate * daysRemaining);

        if (monthlySpending > proRataBudget * 1.2) { 
            const anomalyInsight = await geminiService.fetchSpendingAnomalyInsight(category.name, monthlySpending, proRataBudget, category.monthly_budget, context, category.id);
            if(anomalyInsight) handleAddAIInsight(anomalyInsight);
        }
        if (projectedSpend > category.monthly_budget * 1.05) { 
            const projectionInsight = await geminiService.fetchBudgetOverspendProjectionInsight(category.name, monthlySpending, category.monthly_budget, daysRemaining, projectedSpend, context, category.id);
            if(projectionInsight) handleAddAIInsight(projectionInsight);
        }
    }
  };
  
  const handleFetchRecurringPaymentCandidates = async () => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') {
        addToast("AI Coach desativado ou API Key não configurada.", 'warning');
        return;
    }
    const context = generateFinancialContext();
    if(!context) return;
    const insightData = await geminiService.fetchRecurringPaymentCandidateInsight(transactions, recurringTransactions, context);
    if(insightData) handleAddAIInsight(insightData); else addToast("Nenhum candidato óbvio para recorrência encontrado pela IA.", "info");
  };
  
  const handleFetchSavingOpportunities = async () => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if(!context) return;
    const insightData = await geminiService.fetchSavingOpportunityInsight(transactions, categories, moneyBoxes, context);
    if(insightData) handleAddAIInsight(insightData); else addToast("Nenhuma oportunidade clara de economia encontrada pela IA no momento.", "info");
  };
  
  const handleFetchCashFlowProjection = async (projectionPeriodDays: number = 30, simulatedTransaction?: SimulatedTransactionForProjection) => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') {
        addToast("AI Coach desativado ou API Key não configurada.", 'warning');
        return;
    }
    let context = generateFinancialContext(simulatedTransaction);
    if (!context) {
        addToast("Não foi possível gerar contexto financeiro para a projeção.", 'error');
        return;
    }
    
    const insightData = await geminiService.fetchCashFlowProjectionInsight(context, projectionPeriodDays);
    if (insightData) {
        handleAddAIInsight(insightData);
    } else {
        addToast("Erro ao gerar projeção de fluxo de caixa.", 'error');
    }
  };

  // Future Purchase Handlers
  const handleAddFuturePurchase = (data: Omit<FuturePurchase, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'status' | 'ai_analysis' | 'ai_analyzed_at'>) => {
    const purchaseData = { ...data, status: 'PLANNED' as FuturePurchaseStatus };
    addOrUpdateRecord('future_purchases', purchaseData, setFuturePurchases, (a: FuturePurchase,b: FuturePurchase) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  };
  const handleUpdateFuturePurchase = (data: FuturePurchase) => addOrUpdateRecord('future_purchases', data, setFuturePurchases, (a: FuturePurchase,b: FuturePurchase) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(), true);
  const handleDeleteFuturePurchase = (id: string) => { if (window.confirm('Excluir esta compra futura?')) deleteRecord('future_purchases', id, setFuturePurchases); };
  
  const handleInitiateTransactionFromFuturePurchase = (purchase: FuturePurchase) => {
    if (!user || !activeUserProfile) return;
    const prefillData: Partial<Transaction> = {
        type: TransactionType.EXPENSE,
        amount: purchase.estimated_cost,
        description: `Compra: ${purchase.name}`,
        date: getISODateString(),
    };
    setEditingTransaction(prefillData); 
    setIsTransactionModalOpen(true);
  };

  const handleAnalyzeFuturePurchase = async (purchaseId: string) => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') {
      addToast("AI Coach desativado ou API Key não configurada.", 'warning'); return;
    }
    const purchase = futurePurchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    const originalStatus = purchase.status;
    setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? {...p, status: 'AI_ANALYZING' as FuturePurchaseStatus, ai_analysis: 'Analisando com IA...'} : p));
    
    const context = generateFinancialContext();
    if (!context) { 
      setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? {...p, status: originalStatus, ai_analysis: 'Erro: Contexto financeiro indisponível.'} : p));
      return;
    }

    const result = await geminiService.fetchFuturePurchaseAnalysis(purchase, context);
    
    if (result && 'analysisText' in result && 'recommendedStatus' in result) {
        const updatedPurchase = {
            ...purchase,
            status: result.recommendedStatus,
            ai_analysis: result.analysisText,
            ai_analyzed_at: new Date().toISOString(),
        };
        handleUpdateFuturePurchase(updatedPurchase); 
        const insightContent = `Análise para "${purchase.name}": ${result.analysisText} Status recomendado: ${result.recommendedStatus}.`;
        handleAddAIInsight({
            timestamp: new Date().toISOString(), type: 'future_purchase_advice',
            content: insightContent, related_future_purchase_id: purchase.id, is_read: false,
        });

    } else if (result) { 
        handleAddAIInsight(result as Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>);
        setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? {...p, status: originalStatus, ai_analysis: (result as any).content || 'Erro na análise.'} : p));
    } else {
         setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? {...p, status: originalStatus, ai_analysis: 'Falha ao obter análise da IA.'} : p));
    }
  };

  // Debt & Debt Payment Handlers
  const handleAddDebt = async (debtData: Omit<Debt, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'|'current_balance'|'is_archived'>) => {
    const newDebt = {
        ...debtData,
        current_balance: debtData.initial_balance,
        is_archived: false,
    };
    await addOrUpdateRecord('debts', newDebt, setDebts, (a: Debt,b: Debt) => a.name.localeCompare(b.name));
  };
  const handleUpdateDebt = (debt: Debt) => addOrUpdateRecord('debts', debt, setDebts, (a: Debt,b: Debt) => a.name.localeCompare(b.name), true);
  const handleDeleteDebt = (debtId: string) => {
    if (debtPayments.some(dp => dp.debt_id === debtId)) {
        addToast("Não é possível excluir. Esta dívida possui pagamentos registrados.", "error");
        return;
    }
    if (window.confirm('Excluir esta dívida?')) deleteRecord('debts', debtId, setDebts);
  };

  const handleAddDebtPayment = async (
    paymentData: Omit<DebtPayment, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'|'linked_expense_transaction_id'>,
    createLinkedExpense: boolean,
    linkedAccountId?: string
  ) => {
    if (!user || !activeUserProfile) return;

    let linkedTxId: string | undefined = undefined;
    if (createLinkedExpense && linkedAccountId) {
        const debt = debts.find(d => d.id === paymentData.debt_id);
        const expenseTxData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            type: TransactionType.EXPENSE,
            amount: paymentData.amount_paid,
            date: paymentData.payment_date,
            description: `Pagamento Dívida: ${debt?.name || 'N/A'} ${paymentData.notes ? `- ${paymentData.notes}` : ''}`,
            account_id: linkedAccountId,
        };
        const expenseTx = await addOrUpdateRecord('transactions', expenseTxData, setTransactions, (a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (!expenseTx) { addToast(`Erro ao criar transação de despesa para pagamento de dívida.`, 'error'); return; }
        linkedTxId = expenseTx.id;
    }

    const newPayment = await addOrUpdateRecord(
        'debt_payments', 
        {...paymentData, linked_expense_transaction_id: linkedTxId} as Omit<DebtPayment, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>, 
        setDebtPayments, 
        (a: DebtPayment,b: DebtPayment) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );

    if (newPayment) {
        const debtToUpdate = debts.find(d => d.id === newPayment.debt_id);
        if (debtToUpdate) {
            const updatedBalance = Math.max(0, debtToUpdate.current_balance - newPayment.amount_paid);
            setDebts(prevDebts => prevDebts.map(d => 
                d.id === newPayment.debt_id 
                ? { ...d, current_balance: updatedBalance } 
                : d
            ));
            await supabase.from('debts').update({ current_balance: updatedBalance })
            .eq('id', debtToUpdate.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
        }
    }
  };
  
   const handleFetchDebtStrategyExplanation = async (strategy: DebtStrategy) => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') {
        addToast("AI Coach desativado ou API Key não configurada.", 'warning'); return;
    }
    const insight = await geminiService.fetchDebtStrategyExplanation(strategy);
    if (insight) handleAddAIInsight(insight);
  };
  
  const handleFetchDebtProjectionSummary = async (projection: DebtProjection, debtsForSummary: Debt[], strategy: DebtStrategy) => {
      if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') {
          addToast("AI Coach desativado ou API Key não configurada.", 'warning'); return;
      }
      const context = generateFinancialContext();
      if (!context) { addToast("Contexto financeiro não disponível para resumo.", 'error'); return; }

      const insight = await geminiService.fetchDebtProjectionSummary(projection, debtsForSummary, context);
      if (insight) handleAddAIInsight(insight);
  };


  // Helper for sidebar items
  const SidebarItem: React.FC<{
    view: AppView;
    icon: JSX.Element;
    label: string;
    hasIndicator?: boolean;
  }> = ({ view, icon, label, hasIndicator }) => (
    <li
      onClick={() => setActiveView(view)}
      className={`flex items-center py-2.5 px-4 rounded-md cursor-pointer transition-colors
                  ${activeView === view 
                    ? 'bg-primary dark:bg-primaryDark text-white shadow-lg' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveView(view); }}
      aria-label={`Navegar para ${label}`}
      aria-current={activeView === view ? 'page' : undefined}
    >
      {React.cloneElement(icon, { className: "w-5 h-5 mr-3 flex-shrink-0"})}
      <span className="flex-grow">{label}</span>
      {hasIndicator && <span className="w-2.5 h-2.5 bg-green-400 rounded-full ml-auto animate-pulse"></span>}
    </li>
  );


  // UI Rendering Logic
  if (isLoadingSession) {
    return <div className="min-h-screen flex items-center justify-center bg-backgroundDark text-textBaseDark">Carregando sessão...</div>;
  }
  if (!user) {
    return (
      <>
        <LoginView
          onLoginWithGoogle={handleSignInWithGoogle}
          onLoginWithEmail={handleSignInWithEmail}
          onOpenAuthModal={setAuthModalType}
          isLoadingGoogle={authLoading.google}
          isLoadingEmail={authLoading.email}
          authError={authError}
          clearAuthError={() => setAuthError(null)}
        />
        {authModalType !== 'none' && (
            <AuthModal
            isOpen={true}
            initialMode={authModalType as Exclude<AuthModalType, 'none'>}
            onClose={() => setAuthModalType('none')}
            onSetMode={setAuthModalType}
            onSignUp={handleSignUpWithEmail}
            onForgotPassword={handleSendPasswordResetEmail}
            onResetPassword={handleUpdateUserPassword}
            authError={authError}
            isLoading={authLoading.form}
            clearAuthError={() => setAuthError(null)}
            />
        )}
      </>
    );
  }
  if (isLoadingData && user) { 
     return <div className="min-h-screen flex items-center justify-center bg-backgroundDark text-textBaseDark">Carregando dados do perfil...</div>;
  }
  if (!isLoadingData && !activeUserProfile && user) {
     addToast("Falha ao carregar o perfil. Por favor, tente novamente.", "error");
     return (
        <>
            <LoginView
            onLoginWithGoogle={handleSignInWithGoogle}
            onLoginWithEmail={handleSignInWithEmail}
            onOpenAuthModal={setAuthModalType}
            isLoadingGoogle={authLoading.google}
            isLoadingEmail={authLoading.email}
            authError={authError}
            clearAuthError={() => setAuthError(null)}
            />
            {authModalType !== 'none' && (
                <AuthModal
                isOpen={true}
                initialMode={authModalType as Exclude<AuthModalType, 'none'>}
                onClose={() => setAuthModalType('none')}
                onSetMode={setAuthModalType}
                onSignUp={handleSignUpWithEmail}
                onForgotPassword={handleSendPasswordResetEmail}
                onResetPassword={handleUpdateUserPassword}
                authError={authError}
                isLoading={authLoading.form}
                clearAuthError={() => setAuthError(null)}
                />
            )}
        </>
     );
  }


  const sidebarItems: Array<{ view: AppView; icon: JSX.Element; label: string; hasIndicator?: boolean }> = [
    { view: 'DASHBOARD', icon: <ChartPieIcon />, label: 'Painel Geral' },
    { view: 'CASH_FLOW', icon: <PresentationChartLineIcon />, label: 'Fluxo de Caixa' },
    { view: 'TRANSACTIONS', icon: <ListBulletIcon />, label: 'Transações' },
    { view: 'ACCOUNTS', icon: <BanknotesIcon />, label: 'Contas' },
    { view: 'CATEGORIES', icon: <BookmarkSquareIcon />, label: 'Categorias' },
    { view: 'CREDIT_CARDS', icon: <CreditCardIcon />, label: 'Cartões de Crédito' },
    { view: 'MONEY_BOXES', icon: <PiggyBankIcon />, label: 'Caixinhas' },
    { view: 'FUTURE_PURCHASES', icon: <ShoppingCartIcon />, label: 'Compras Futuras' },
    { view: 'TAGS', icon: <TagIcon />, label: 'Tags' },
    { view: 'RECURRING_TRANSACTIONS', icon: <ArrowPathIcon />, label: 'Recorrências' },
    { view: 'LOANS', icon: <UsersIcon />, label: 'Empréstimos' },
    { view: 'DEBT_PLANNER', icon: <BanknotesIcon />, label: 'Planejador Dívidas' },
    { view: 'AI_COACH', icon: <ChatBubbleLeftRightIcon />, label: 'AI Coach', hasIndicator: aiConfig.isEnabled && aiConfig.apiKeyStatus === 'available' },
    { view: 'AJUDE_PROJETO', icon: <HeartIcon className="text-red-500"/>, label: 'Ajude o Projeto' },
  ];

  return (
    <div className="flex h-screen bg-background dark:bg-backgroundDark">
      <aside className="w-64 bg-slate-50 dark:bg-slate-900 flex flex-col shadow-2xl fixed inset-y-0 left-0 z-30">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{APP_NAME}</h1>
          {user && (
            <>
              <div className="mt-3 flex items-center space-x-3">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-primary dark:border-primaryDark" />
                ) : (
                  <UserCircleIcon className="w-10 h-10 text-slate-500 dark:text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={activeUserDisplayName}>{activeUserDisplayName}</p>
                </div>
              </div>
              <div 
                className="mt-2 flex items-center space-x-2 px-1 py-1.5 rounded-md cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                onClick={togglePrivacyMode}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePrivacyMode(); }}
                title={isPrivacyModeEnabled ? "Modo Privacidade Ativado" : "Modo Privacidade Desativado. Clique para alternar."}
              >
                {isPrivacyModeEnabled ? <EyeSlashIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /> : <EyeIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
                <span className="text-sm text-slate-600 dark:text-slate-300">{isPrivacyModeEnabled ? 'Privado' : 'Normal'}</span>
              </div>
            </>
          )}
        </div>
        <nav className="flex-grow p-3 space-y-1.5 overflow-y-auto">
          <ul>
            {sidebarItems.map(item => (
              <SidebarItem key={item.view} {...item} />
            ))}
          </ul>
        </nav>
        <div className="p-2 border-t border-slate-200 dark:border-slate-700">
           <ThemeSwitcher theme={theme} setTheme={setTheme} />
           <Button 
                variant="ghost" 
                onClick={handleSignOut}
                className="w-full mt-2 !justify-start !px-3 !py-2 text-sm text-slate-600 dark:text-slate-300 hover:!bg-red-500 dark:hover:!bg-red-600 hover:!text-white dark:hover:!text-white"
            >
                <PowerIcon className="w-5 h-5 mr-2.5" /> Sair
            </Button>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-y-auto bg-background dark:bg-backgroundDark text-textBase dark:text-textBaseDark">
        {activeView === 'DASHBOARD' && <DashboardView transactions={transactions} accounts={accounts} categories={categories} creditCards={creditCards} installmentPurchases={installmentPurchases} moneyBoxes={moneyBoxes} loans={loans} loanRepayments={loanRepayments} recurringTransactions={recurringTransactions} onAddTransaction={() => { setEditingTransaction(null); setIsTransactionModalOpen(true); }} calculateAccountBalance={calculateAccountBalance} calculateMoneyBoxBalance={calculateMoneyBoxBalance} onViewRecurringTransaction={(rtId) => setActiveView('RECURRING_TRANSACTIONS')} isPrivacyModeEnabled={isPrivacyModeEnabled} onFetchGeneralAdvice={handleFetchGeneralAdvice} onFetchSavingOpportunities={handleFetchSavingOpportunities} />}
        {activeView === 'CASH_FLOW' && <CashFlowView transactions={transactions} accounts={accounts} categories={categories} isPrivacyModeEnabled={isPrivacyModeEnabled} onFetchCashFlowProjection={handleFetchCashFlowProjection} />}
        {activeView === 'TRANSACTIONS' && <TransactionsView transactions={transactions} accounts={accounts} categories={categories} tags={tags} installmentPurchases={installmentPurchases} onAddTransaction={() => { setEditingTransaction(null); setIsTransactionModalOpen(true); }} onEditTransaction={(tx) => { setEditingTransaction(tx); setIsTransactionModalOpen(true); }} onDeleteTransaction={handleDeleteTransaction} isLoading={isLoadingData} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
        {activeView === 'ACCOUNTS' && <AccountsView accounts={accounts} transactions={transactions} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount} calculateAccountBalance={calculateAccountBalance} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
        {activeView === 'CATEGORIES' && <CategoriesView categories={categories} transactions={transactions} aiConfig={aiConfig} onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onSuggestBudget={handleSuggestBudgetForCategory} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
        {activeView === 'CREDIT_CARDS' && <CreditCardsView creditCards={creditCards} installmentPurchases={installmentPurchases} aiConfig={aiConfig} onAddCreditCard={handleAddCreditCard} onUpdateCreditCard={handleUpdateCreditCard} onDeleteCreditCard={handleDeleteCreditCard} onAddInstallmentPurchase={handleAddInstallmentPurchase} onUpdateInstallmentPurchase={handleUpdateInstallmentPurchase} onDeleteInstallmentPurchase={handleDeleteInstallmentPurchase} onMarkInstallmentPaid={handleMarkInstallmentPaid} onPayMonthlyInstallments={handlePayMonthlyInstallments} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
        {activeView === 'MONEY_BOXES' && <MoneyBoxesView moneyBoxes={moneyBoxes} moneyBoxTransactions={moneyBoxTransactions} accounts={accounts} onAddMoneyBox={handleAddMoneyBox} onUpdateMoneyBox={handleUpdateMoneyBox} onDeleteMoneyBox={handleDeleteMoneyBox} onAddMoneyBoxTransaction={handleAddMoneyBoxTransaction} onDeleteMoneyBoxTransaction={handleDeleteMoneyBoxTransaction} calculateMoneyBoxBalance={calculateMoneyBoxBalance} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
        {activeView === 'FUTURE_PURCHASES' && <FuturePurchasesView futurePurchases={futurePurchases} onAddFuturePurchase={handleAddFuturePurchase} onUpdateFuturePurchase={handleUpdateFuturePurchase} onDeleteFuturePurchase={handleDeleteFuturePurchase} onAnalyzeFuturePurchase={handleAnalyzeFuturePurchase} onInitiateTransaction={handleInitiateTransactionFromFuturePurchase} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
        {activeView === 'TAGS' && <TagsView tags={tags} transactions={transactions} onAddTag={handleAddTag} onUpdateTag={handleUpdateTag} onDeleteTag={handleDeleteTag} />}
        {activeView === 'RECURRING_TRANSACTIONS' && <RecurringTransactionsView recurringTransactions={recurringTransactions} accounts={accounts} creditCards={creditCards} categories={categories} onAddRecurringTransaction={handleAddRecurringTransaction} onUpdateRecurringTransaction={handleUpdateRecurringTransaction} onDeleteRecurringTransaction={handleDeleteRecurringTransaction} onProcessRecurringTransactions={handleProcessRecurringTransactions} isPrivacyModeEnabled={isPrivacyModeEnabled} onFetchRecurringPaymentCandidates={handleFetchRecurringPaymentCandidates}/>}
        {activeView === 'LOANS' && <LoansView loans={loans} loanRepayments={loanRepayments} accounts={accounts} creditCards={creditCards} onAddLoan={handleAddLoan} onUpdateLoan={handleUpdateLoan} onDeleteLoan={handleDeleteLoan} onAddLoanRepayment={handleAddLoanRepayment} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
        {activeView === 'DEBT_PLANNER' && <DebtPlannerView debts={debts} debtPayments={debtPayments} accounts={accounts} onAddDebt={handleAddDebt} onUpdateDebt={handleUpdateDebt} onDeleteDebt={handleDeleteDebt} onAddDebtPayment={handleAddDebtPayment} onFetchDebtStrategyExplanation={handleFetchDebtStrategyExplanation} onFetchDebtProjectionSummary={handleFetchDebtProjectionSummary} isPrivacyModeEnabled={isPrivacyModeEnabled} />}
        {activeView === 'AI_COACH' && <AICoachView aiConfig={aiConfig} setAiConfig={updateAiConfig} insights={aiInsights} onUpdateInsight={handleUpdateAIInsight} isPrivacyModeEnabled={isPrivacyModeEnabled} onDeleteAllInsights={handleDeleteAllAIInsights}/>}
        {activeView === 'AJUDE_PROJETO' && <AjudeProjetoView />}
      </main>

      {isTransactionModalOpen && (
        <Modal isOpen={isTransactionModalOpen} onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null);}} title={editingTransaction && 'id' in editingTransaction ? 'Editar Transação' : 'Nova Transação'} size="lg">
          <TransactionForm
            onSubmit={handleAddOrUpdateTransaction}
            onCancel={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }}
            accounts={accounts}
            creditCards={creditCards}
            moneyBoxes={moneyBoxes}
            categories={categories}
            tags={tags}
            initialTransaction={editingTransaction as Transaction | null} 
            isPrivacyModeEnabled={isPrivacyModeEnabled}
            addToast={addToast}
          />
        </Modal>
      )}
      {authModalType !== 'none' && user && ( // Only show auth modal if user is logged in and needs to reset password
        <AuthModal
          isOpen={true}
          initialMode={authModalType as Exclude<AuthModalType, 'none'>}
          onClose={() => setAuthModalType('none')}
          onSetMode={setAuthModalType}
          onSignUp={handleSignUpWithEmail} // Not typically used when already logged in
          onForgotPassword={handleSendPasswordResetEmail} // Not typically used
          onResetPassword={handleUpdateUserPassword}
          authError={authError}
          isLoading={authLoading.form}
          clearAuthError={() => setAuthError(null)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
