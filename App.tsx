
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
  Debt, DebtPayment, DebtStrategy, DebtProjection
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
import DebtPlannerView from './components/DebtPlannerView';
import ProfileSelectionView from './components/ProfileSelectionView';


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
import BanknotesIcon from './components/icons/BanknotesIcon'; // Added from DebtPlanner

// Services
import * as geminiService from './services/geminiService';
import type { FinancialContext, SimulatedTransactionData } from './services/geminiService';
// Use relative path for the shim, as importmap is removed for Vite compatibility
import { GoogleGenAI, GenerateContentResponse, Chat } from "./google-genai-shim";


const AppContent: React.FC = () => {
  const { addToast } = useToasts();

  // Auth State
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- Profile State ---
  const [availableProfiles, setAvailableProfiles] = useState<UserProfile[]>([]);
  const [activeUserProfile, setActiveUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true); // Tracks loading of profile list
  const [initialProfilesLoaded, setInitialProfilesLoaded] = useState(false); // Tracks if the *first attempt* to load profiles for a session is done


  // User Preferences State (synced with Supabase)
  const [currentUserPreferences, setCurrentUserPreferences] = useState<UserPreferences | null>(null); // Store full preferences object
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
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);


  // Loading states for data
  const [isLoadingData, setIsLoadingData] = useState(true); // Tracks loading of data for *active profile*

  const [activeView, setActiveView] = useState<AppView>('DASHBOARD');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const activeUserDisplayName = useMemo(() => {
    return activeUserProfile?.name || user?.user_metadata?.full_name || user?.email || "Usuário";
  }, [user, activeUserProfile]);

  // --- Auth Effects and Functions ---

  const fetchAndSetAllUserData = useCallback(async (userId: string, profileId: string) => {
    if (!profileId || !userId) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
        const { data: prefsData, error: prefsError } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId) // Ensure user_id is also part of the query
            .eq('profile_id', profileId) 
            .single();

        if (prefsError && prefsError.code !== 'PGRST116') throw prefsError; // PGRST116 means no rows found, which is fine
        
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
            // No existing preferences, create them
            const defaultPrefs: Omit<UserPreferences, 'created_at' | 'updated_at'> = {
                id: generateClientSideId(), // Provide client-side ID
                user_id: userId, 
                profile_id: profileId, 
                theme: 'system', is_privacy_mode_enabled: false,
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

        const dataFilter = (query: any) => query.eq('user_id', userId).eq('profile_id', profileId);

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
            const seedAccs = getSeedAccounts(userId, profileId).map(acc => ({ ...acc, user_id: userId, profile_id: profileId })); 
            const { data: newAccs, error: seedAccError } = await supabase.from('accounts').insert(seedAccs).select();
            if (seedAccError) throw seedAccError;
            if (newAccs) setAccounts(newAccs as Account[]);
        }
        if (categoriesRes.data?.length === 0) {
            const seedCats = getSeedCategories(userId, profileId).map(cat => ({ ...cat, user_id: userId, profile_id: profileId })); 
            const { data: newCats, error: seedCatError } = await supabase.from('categories').insert(seedCats).select();
            if (seedCatError) throw seedCatError;
            if (newCats) setCategories(newCats as Category[]);
        }
        setActiveView('DASHBOARD');

    } catch (error: any) {
        console.error("Error fetching user data:", error);
        addToast(`Erro ao carregar dados do perfil: ${error.message}`, 'error');
    } finally {
        setIsLoadingData(false);
    }
  }, [addToast]);


  const handleSelectProfile = useCallback((profileId: string, profilesToSearch: UserProfile[]) => {
    const profile = profilesToSearch.find(p => p.id === profileId);
    if (profile && user) {
      setActiveUserProfile(profile);
      localStorage.setItem(`lastActiveProfile_${user.id}`, profileId);
      fetchAndSetAllUserData(user.id, profileId);
    }
  }, [user, fetchAndSetAllUserData]); 

  const fetchUserProfiles = useCallback(async (userId: string) => {
    setIsLoadingProfiles(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      
      const profilesData = data || [];
      setAvailableProfiles(profilesData);
      
      if (profilesData.length > 0) {
        const lastProfileId = localStorage.getItem(`lastActiveProfile_${userId}`);
        const lastActive = profilesData.find(p => p.id === lastProfileId);
        if (lastActive) {
          handleSelectProfile(lastActive.id, profilesData); 
        } else {
          setActiveUserProfile(null); 
          setIsLoadingData(false); 
        }
      } else {
         setActiveUserProfile(null); 
         setIsLoadingData(false); 
      }
    } catch (error: any) {
      console.error("Error fetching profiles in fetchUserProfiles:", error);
      addToast(`Erro ao carregar perfis: ${error.message}`, 'error');
      setAvailableProfiles([]);
      setActiveUserProfile(null);
      setIsLoadingData(false); 
    } finally {
      setIsLoadingProfiles(false);
      setInitialProfilesLoaded(true); 
    }
  }, [addToast, handleSelectProfile]); 

  useEffect(() => {
    setIsLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      setIsLoadingSession(false);
      
      if (currentUser) {
        fetchUserProfiles(currentUser.id);
      } else {
        setInitialProfilesLoaded(true); 
        setIsLoadingProfiles(false);
        setIsLoadingData(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        const newUser = newSession?.user ?? null;
        setUser(newUser);
        setIsLoadingSession(false);
        
        setActiveUserProfile(null); 
        setAvailableProfiles([]);
        setTransactions([]); setAccounts([]); setCategories([]); setCreditCards([]);
        setInstallmentPurchases([]); setMoneyBoxes([]); setMoneyBoxTransactions([]);
        setFuturePurchases([]); setTags([]); setRecurringTransactions([]);
        setLoans([]); setLoanRepayments([]); setAiInsights([]);
        setDebts([]); setDebtPayments([]);
        setThemeState('system'); setIsPrivacyModeEnabledState(false);
        setCurrentUserPreferences(null);
        setAiConfigState({ isEnabled: false, apiKeyStatus: 'unknown', monthlyIncome: null, autoBackupToFileEnabled: false });
        
        setInitialProfilesLoaded(false); 
        setIsLoadingProfiles(true); 
        setIsLoadingData(true); 

        if (_event === 'SIGNED_OUT') {
            setActiveView('LOGIN');
            addToast("Você foi desconectado.", 'info');
            setInitialProfilesLoaded(true); 
            setIsLoadingProfiles(false);
            setIsLoadingData(false);
        } else if ((_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') && newUser) {
            fetchUserProfiles(newUser.id); 
        } else if (!newUser) { 
            setInitialProfilesLoaded(true);
            setIsLoadingProfiles(false);
            setIsLoadingData(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [addToast, fetchUserProfiles]); 
  
  const handleCreateProfile = async (name: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({ user_id: user.id, name: name })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const newProfile = data as UserProfile;
        setAvailableProfiles(prev => [...prev, newProfile]);
        handleSelectProfile(newProfile.id, [...availableProfiles, newProfile]); 
        addToast(`Perfil "${name}" criado com sucesso!`, 'success');
      }
    } catch (error: any) {
      addToast(`Erro ao criar perfil: ${error.message}`, 'error');
    }
  };

  const updateUserPreference = useCallback(async (userId: string,  profileId: string, key: keyof Omit<UserPreferences, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>, value: any) => {
      if (!profileId || !userId) return;
      const { error } = await supabase
        .from('user_preferences')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('profile_id', profileId);
      if (error) {
        console.error(`Error updating user preference ${key}:`, error);
        addToast(`Erro ao salvar preferência (${key}): ${error.message}`, 'error');
      } else {
        // Optimistically update local state if needed, or re-fetch preferences
         setCurrentUserPreferences(prev => prev ? ({ ...prev, [key]: value, updated_at: new Date().toISOString() }) : null);
      }
  }, [addToast]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (user && activeUserProfile) updateUserPreference(user.id, activeUserProfile.id, 'theme', newTheme);
  }, [user, activeUserProfile, updateUserPreference]);

  const togglePrivacyMode = useCallback(() => {
    const newPrivacyModeState = !isPrivacyModeEnabled;
    setIsPrivacyModeEnabledState(newPrivacyModeState);
    if (user && activeUserProfile) updateUserPreference(user.id, activeUserProfile.id, 'is_privacy_mode_enabled', newPrivacyModeState);
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
                    // Optimistically update local state or re-fetch
                    setCurrentUserPreferences(prev => prev ? ({...prev, ...updatedConfigFields, updated_at: new Date().toISOString()}) : null);
                }
            });
    }
  }, [user, activeUserProfile, addToast]);


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
          redirectTo: `${window.location.origin}${ (import.meta as any).env.BASE_URL || '/'}`,
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

  const generateFinancialContext = useCallback((simulatedTx?: SimulatedTransactionData): FinancialContext | null => {
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

  const handleAddAIInsight = async (insight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'>) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('ai_insights').insert({ ...insight, user_id: user.id, profile_id: activeUserProfile.id }).select().single();
    if (error) { addToast(`Erro ao salvar insight: ${error.message}`, 'error'); }
    else if (data) { setAiInsights(prev => [data as AIInsight, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())); }
  };
  
  const handleFetchGeneralAIAdvice = useCallback(async () => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;

    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'> = {
      timestamp: new Date().toISOString(), type: 'general_advice', content: "Buscando novo conselho...", is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId(); 
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, profile_id: activeUserProfile!.id, created_at: '', updated_at: ''}, ...prev]);

    const advice = await geminiService.fetchGeneralAdvice(context);
    
    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId)); 
    if (advice) handleAddAIInsight(advice); 
    
  }, [user, activeUserProfile, aiConfig.isEnabled, aiConfig.apiKeyStatus, generateFinancialContext, handleAddAIInsight]);

  const handleGenerateCommentForTransaction = useCallback(async (transaction: Transaction) => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;

     const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'> = {
        timestamp: new Date().toISOString(), type: 'transaction_comment',
        content: `Analisando transação: ${transaction.description || transaction.type}...`,
        related_transaction_id: transaction.id, is_read: false, isLoading: true,
      };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, profile_id: activeUserProfile!.id, created_at: '', updated_at: ''}, ...prev]);
    
    const categoryName = transaction.category_id ? categories.find(c => c.id === transaction.category_id)?.name : undefined;
    const accountName = accounts.find(a => a.id === transaction.account_id)?.name || creditCards.find(cc => cc.id === transaction.account_id)?.name;
    const comment = await geminiService.fetchCommentForTransaction(transaction, context, categoryName, accountName);

    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (comment) handleAddAIInsight(comment);
  }, [user, activeUserProfile, aiConfig.isEnabled, aiConfig.apiKeyStatus, categories, accounts, creditCards, generateFinancialContext, handleAddAIInsight]);

  const handleAnalyzeSpendingForCategory = useCallback(async (transaction: Transaction) => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available' || transaction.type !== TransactionType.EXPENSE || !transaction.category_id) {
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

  }, [user, activeUserProfile, aiConfig, categories, transactions, generateFinancialContext, handleAddAIInsight]);

  const handleFetchRecurringPaymentCandidates = useCallback(async () => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;

    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'> = {
        timestamp: new Date().toISOString(), type: 'recurring_payment_candidate',
        content: "Analisando possíveis despesas recorrentes não cadastradas...", is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, profile_id: activeUserProfile!.id, created_at: '', updated_at: ''}, ...prev]);
    
    const insight = await geminiService.fetchRecurringPaymentCandidateInsight(transactions, recurringTransactions, context);
    
    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (insight) handleAddAIInsight(insight);
    else addToast("Nenhuma nova despesa recorrente óbvia encontrada.", "info");
  }, [user, activeUserProfile, aiConfig, transactions, recurringTransactions, generateFinancialContext, handleAddAIInsight, addToast]);

  const handleFetchSavingOpportunities = useCallback(async () => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;

    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'> = {
        timestamp: new Date().toISOString(), type: 'saving_opportunity_suggestion',
        content: "Buscando oportunidades de economia...", is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, profile_id: activeUserProfile!.id, created_at: '', updated_at: ''}, ...prev]);

    const insight = await geminiService.fetchSavingOpportunityInsight(transactions, categories, moneyBoxes, context);

    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (insight) handleAddAIInsight(insight);
    else addToast("Nenhuma oportunidade clara de economia encontrada no momento.", "info");
  }, [user, activeUserProfile, aiConfig, transactions, categories, moneyBoxes, generateFinancialContext, handleAddAIInsight, addToast]);

  const handleFetchCashFlowProjection = useCallback(async (projectionPeriodDays: number = 30, simulatedTx?: SimulatedTransactionData) => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext(simulatedTx);
    if (!context) return;

    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'> = {
        timestamp: new Date().toISOString(), type: 'cash_flow_projection',
        content: `Gerando projeção de fluxo de caixa para os próximos ${projectionPeriodDays} dias${simulatedTx ? ' (com simulação)' : ''}...`, 
        is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, profile_id: activeUserProfile!.id, created_at: '', updated_at: ''}, ...prev]);

    const insight = await geminiService.fetchCashFlowProjectionInsight(context, projectionPeriodDays);
    
    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (insight) handleAddAIInsight(insight); 
  }, [user, activeUserProfile, aiConfig, generateFinancialContext, handleAddAIInsight]);


  const handleSuggestCategoryBudget = useCallback(async (categoryName: string, currentExpenseBudgets: {name: string, budget?: number}[]) => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available' || !aiConfig.monthlyIncome) { addToast("Renda mensal não informada ou IA desativada.", 'warning'); return null; }
    
    const context = generateFinancialContext();
    if (!context) return null;

    const relatedCat = categories.find(c=>c.name === categoryName && c.type === TransactionType.EXPENSE);
    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'> = {
        timestamp: new Date().toISOString(), type: 'budget_recommendation',
        content: `Calculando sugestão de orçamento para ${categoryName}...`, 
        related_category_id: relatedCat?.id, is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, profile_id: activeUserProfile!.id, created_at: '', updated_at: ''}, ...prev]);
    
    const result = await geminiService.fetchBudgetSuggestion(categoryName, aiConfig.monthlyIncome, currentExpenseBudgets, context);

    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (result && 'suggestedBudget' in result && typeof result.suggestedBudget === 'number') {
        const successInsight: Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'> = { 
            content: `Sugestão para ${categoryName}: ${formatCurrency(result.suggestedBudget)}`, 
            related_category_id: relatedCat?.id, 
            timestamp: new Date().toISOString(), type: 'budget_recommendation', is_read: false 
        };
        handleAddAIInsight(successInsight);
        return result.suggestedBudget;
    } else if (result && 'content' in result) { 
        handleAddAIInsight(result as Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'>);
    }
    return null;
  }, [user, activeUserProfile, aiConfig, categories, generateFinancialContext, addToast, handleAddAIInsight]);

  const handleAnalyzeFuturePurchase = useCallback(async (purchaseId: string) => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') { addToast("AI Coach desativado ou API Key indisponível.", 'warning'); return; }
    const purchase = futurePurchases.find(p => p.id === purchaseId);
    if (!purchase) return;
    
    const context = generateFinancialContext();
    if (!context) return;

    setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'AI_ANALYZING' } : p));
    const result = await geminiService.fetchFuturePurchaseAnalysis(purchase, context);

    if (result && 'analysisText' in result) {
        const { data, error } = await supabase.from('future_purchases')
            .update({ status: result.recommendedStatus, ai_analysis: result.analysisText, ai_analyzed_at: new Date().toISOString() })
            .eq('id', purchaseId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
        
        if (error || !data) {
            addToast(`Erro ao atualizar compra futura: ${error?.message || 'Falha'}`, 'error');
            setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: purchase.status } : p)); 
        } else {
            setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? data as FuturePurchase : p));
            addToast(`Análise para "${purchase.name}" concluída!`, 'info');
        }
    } else if (result && 'content' in result) { 
        handleAddAIInsight(result as Omit<AIInsight, 'id'|'user_id'|'created_at'|'updated_at'|'profile_id'>);
        setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: purchase.status } : p)); 
    }
  }, [user, activeUserProfile, aiConfig, futurePurchases, generateFinancialContext, addToast, handleAddAIInsight]);
  
  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !activeUserProfile) return;
    const newTransactionSupabase = { ...transactionData, user_id: user.id, profile_id: activeUserProfile.id };
    
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
            const installmentPurchaseData: Omit<InstallmentPurchase, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
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
    if (!user || !activeUserProfile || !updatedTransactionData.id) return;

    const originalTransaction = transactions.find(t => t.id === updatedTransactionData.id);
    if (!originalTransaction) { addToast("Erro: Transação original não encontrada.", 'error'); return; }
    const payload = { ...updatedTransactionData, profile_id: activeUserProfile.id };

    const { data: updatedTransaction, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', updatedTransactionData.id)
        .eq('user_id', user.id)
        .eq('profile_id', activeUserProfile.id) 
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
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user || !activeUserProfile) return;
      const { error } = await supabase.from('transactions').delete()
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .eq('profile_id', activeUserProfile.id); 
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setTransactions(prev => prev.filter(t => t.id !== transactionId)); addToast('Transação excluída!', 'success'); }
  };

    const handleAddAccount = async (account: Omit<Account, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('accounts').insert({ ...account, user_id: user.id, profile_id: activeUserProfile.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setAccounts(prev => [...prev, data as Account].sort((a,b) => a.name.localeCompare(b.name))); addToast('Conta adicionada!', 'success');}
  };
  const handleUpdateAccount = async (updatedAccount: Account) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('accounts').update({...updatedAccount, profile_id: activeUserProfile.id}).eq('id', updatedAccount.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setAccounts(prev => prev.map(acc => acc.id === data.id ? data as Account : acc).sort((a,b) => a.name.localeCompare(b.name))); addToast('Conta atualizada!', 'success');}
  };
  const handleDeleteAccount = async (accountId: string) => {
    if (!user || !activeUserProfile) return;
    if (window.confirm('Excluir esta conta?')) {
      const { error } = await supabase.from('accounts').delete().eq('id', accountId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setAccounts(prev => prev.filter(acc => acc.id !== accountId)); addToast('Conta excluída!', 'success'); }
    }
  };

  const handleAddCategory = async (category: Omit<Category, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('categories').insert({ ...category, user_id: user.id, profile_id: activeUserProfile.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setCategories(prev => [...prev, data as Category].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Categoria adicionada!', 'success');}
  };
  const handleUpdateCategory = async (updatedCategory: Category) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('categories').update({...updatedCategory, profile_id: activeUserProfile.id}).eq('id', updatedCategory.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setCategories(prev => prev.map(cat => cat.id === data.id ? data as Category : cat).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Categoria atualizada!', 'success');}
  };
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user || !activeUserProfile) return;
    if (window.confirm('Excluir esta categoria?')) {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setCategories(prev => prev.filter(cat => cat.id !== categoryId)); addToast('Categoria excluída!', 'success');}
    }
  };
  
  const handleAddCreditCard = async (card: Omit<CreditCard, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('credit_cards').insert({ ...card, user_id: user.id, profile_id: activeUserProfile.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setCreditCards(prev => [...prev, data as CreditCard].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Cartão adicionado!', 'success'); }
  };
  const handleUpdateCreditCard = async (updatedCard: CreditCard) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('credit_cards').update({...updatedCard, profile_id: activeUserProfile.id}).eq('id', updatedCard.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setCreditCards(prev => prev.map(cc => cc.id === data.id ? data as CreditCard : cc).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Cartão atualizado!', 'success'); }
  };
  const handleDeleteCreditCard = async (cardId: string) => {
     if (!user || !activeUserProfile) return;
    if (window.confirm('Excluir este cartão?')) {
      const { error } = await supabase.from('credit_cards').delete().eq('id', cardId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setCreditCards(prev => prev.filter(cc => cc.id !== cardId)); addToast('Cartão excluído!', 'success'); }
    }
  };

  const handleAddInstallmentPurchase = async (purchase: Omit<InstallmentPurchase, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>, showToast = true) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('installment_purchases').insert({ ...purchase, user_id: user.id, profile_id: activeUserProfile.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { 
        setInstallmentPurchases(prev => [...prev, data as InstallmentPurchase].sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()));
        if (showToast) addToast('Compra parcelada adicionada!', 'success'); 
    }
  };
  const handleUpdateInstallmentPurchase = async (updatedPurchase: InstallmentPurchase, showToast = true) => {
     if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('installment_purchases').update({...updatedPurchase, profile_id: activeUserProfile.id}).eq('id', updatedPurchase.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { 
        setInstallmentPurchases(prev => prev.map(ip => ip.id === data.id ? data as InstallmentPurchase : ip).sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())); 
        if (showToast) addToast('Compra parcelada atualizada!', 'success'); 
    }
  };
  const handleDeleteInstallmentPurchase = async (purchaseId: string, cascadeDeleteTransaction = true) => {
    if (!user || !activeUserProfile) return;
    const purchaseToDelete = installmentPurchases.find(ip => ip.id === purchaseId);
    if (purchaseToDelete?.linked_transaction_id && purchaseToDelete.number_of_installments === 1 && cascadeDeleteTransaction) {
        await supabase.from('transactions').delete().eq('id', purchaseToDelete.linked_transaction_id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
    }
    const { error } = await supabase.from('installment_purchases').delete().eq('id', purchaseId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else { setInstallmentPurchases(prev => prev.filter(ip => ip.id !== purchaseId)); addToast('Compra parcelada excluída!', 'success'); }
  };
   const handleMarkInstallmentPaid = async (purchaseId: string) => {
    if (!user || !activeUserProfile) return;
    const purchase = installmentPurchases.find(p => p.id === purchaseId);
    if (!purchase) return;
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
  
  const handleAddMoneyBox = async (moneyBox: Omit<MoneyBox, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('money_boxes').insert({ ...moneyBox, user_id: user.id, profile_id: activeUserProfile.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setMoneyBoxes(prev => [...prev, data as MoneyBox].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Caixinha adicionada!', 'success');}
  };
  const handleUpdateMoneyBox = async (updatedMoneyBox: MoneyBox) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('money_boxes').update({...updatedMoneyBox, profile_id: activeUserProfile.id}).eq('id', updatedMoneyBox.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setMoneyBoxes(prev => prev.map(mb => mb.id === data.id ? data as MoneyBox : mb).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Caixinha atualizada!', 'success');}
  };
  const handleDeleteMoneyBox = async (moneyBoxId: string) => {
      if (!user || !activeUserProfile) return;
      if (window.confirm('Excluir esta caixinha?')) {
        const { error } = await supabase.from('money_boxes').delete().eq('id', moneyBoxId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
        if (error) { addToast(`Erro ao excluir caixinha: ${error.message}`, 'error');}
        else {setMoneyBoxes(prev => prev.filter(mb => mb.id !== moneyBoxId)); addToast('Caixinha excluída!', 'success');}
      }
  };

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
        };
        const {data: mainTx, error: mainTxError} = await supabase.from('transactions').insert({...mainTxData, user_id: user.id, profile_id: activeUserProfile.id}).select().single();
        if (mainTxError || !mainTx) { addToast(`Erro ao criar transação principal: ${mainTxError?.message}`, 'error'); return; }
        linkedTxId = mainTx.id;
        setTransactions(prev => [mainTx as Transaction, ...prev]);
    }
    const { data: newMbt, error: mbtError } = await supabase.from('money_box_transactions').insert({ ...mbt, user_id: user.id, profile_id: activeUserProfile.id, linked_transaction_id: linkedTxId }).select().single();
    if (mbtError) { addToast(`Erro: ${mbtError.message}`, 'error'); }
    else if (newMbt) { setMoneyBoxTransactions(prev => [newMbt as MoneyBoxTransaction, ...prev]); addToast('Transação da caixinha adicionada!', 'success'); }
  };
  const handleDeleteMoneyBoxTransaction = async (mbtId: string, linkedTransactionId?: string) => {
    if (!user || !activeUserProfile) return;
      const { error } = await supabase.from('money_box_transactions').delete().eq('id', mbtId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
      if (error) { addToast(`Erro ao excluir: ${error.message}`, 'error'); }
      else { 
        setMoneyBoxTransactions(prev => prev.filter(mbt => mbt.id !== mbtId));
        if (linkedTransactionId) {
            // Optionally, inform user the main transaction was not deleted or offer to delete it.
            // For now, we just delete the MBT.
        }
        addToast('Transação da caixinha excluída!', 'success');
      }
  };

  const handleAddTag = async (tag: Omit<Tag, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('tags').insert({ ...tag, user_id: user.id, profile_id: activeUserProfile.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setTags(prev => [...prev, data as Tag].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Tag adicionada!', 'success');}
  };
  const handleUpdateTag = async (updatedTag: Tag) => {
     if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('tags').update({...updatedTag, profile_id: activeUserProfile.id}).eq('id', updatedTag.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setTags(prev => prev.map(t => t.id === data.id ? data as Tag : t).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Tag atualizada!', 'success');}
  };
  const handleDeleteTag = async (tagId: string) => {
     if (!user || !activeUserProfile) return;
    if (window.confirm('Excluir esta tag?')) {
      const { error } = await supabase.from('tags').delete().eq('id', tagId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setTags(prev => prev.filter(t => t.id !== tagId)); addToast('Tag excluída!', 'success');}
    }
  };
  
  const handleAddRecurringTransaction = async (rt: Omit<RecurringTransaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'>) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('recurring_transactions').insert({ ...rt, user_id: user.id, profile_id: activeUserProfile.id }).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setRecurringTransactions(prev => [...prev, data as RecurringTransaction].sort((a,b)=>new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())); addToast('Recorrência adicionada!', 'success');}
  };
  const handleUpdateRecurringTransaction = async (updatedRT: RecurringTransaction) => {
     if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('recurring_transactions').update({...updatedRT, profile_id: activeUserProfile.id}).eq('id', updatedRT.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if (error) { addToast(`Erro: ${error.message}`, 'error'); }
    else if (data) { setRecurringTransactions(prev => prev.map(r => r.id === data.id ? data as RecurringTransaction : r).sort((a,b)=>new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())); addToast('Recorrência atualizada!', 'success');}
  };
  const handleDeleteRecurringTransaction = async (rtId: string) => {
    if (!user || !activeUserProfile) return;
    if (window.confirm('Excluir esta recorrência?')) {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', rtId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
      if (error) { addToast(`Erro: ${error.message}`, 'error'); }
      else { setRecurringTransactions(prev => prev.filter(r => r.id !== rtId)); addToast('Recorrência excluída!', 'success'); }
    }
  };
  const handleProcessRecurringTransactions = async (): Promise<{ count: number; errors: string[] }> => {
    if (!user || !activeUserProfile) return { count: 0, errors: ["Usuário ou perfil não ativo."]};
    const toProcess = recurringTransactions.filter(rt => !rt.is_paused && new Date(rt.next_due_date) <= new Date() && (rt.remaining_occurrences === undefined || rt.remaining_occurrences > 0));
    let count = 0;
    const errors: string[] = [];

    for (const rt of toProcess) {
        const transactionData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            type: rt.type,
            amount: rt.amount,
            category_id: rt.category_id,
            description: `Recorrência: ${rt.description}`,
            date: rt.next_due_date,
            account_id: rt.account_id,
            to_account_id: rt.to_account_id,
        };
        await handleAddTransaction(transactionData); 

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

  const handleAddLoan = async (loanData: Omit<Loan, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'|'linked_expense_transaction_id'|'linked_installment_purchase_id'>, ccInstallmentsFromForm?: number) => {
    if (!user || !activeUserProfile) return;
    let linkedExpenseTxId: string | undefined = undefined;
    if (loanData.funding_source === 'account' && loanData.amount_delivered_from_account && loanData.linked_account_id) {
        const expenseTxData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            type: TransactionType.EXPENSE, amount: loanData.amount_delivered_from_account, date: loanData.loan_date,
            description: `Empréstimo para ${loanData.person_name}`, account_id: loanData.linked_account_id,
        };
        const {data: expenseTx, error: expenseError} = await supabase.from('transactions').insert({...expenseTxData, user_id: user.id, profile_id: activeUserProfile.id}).select().single();
        if(expenseError || !expenseTx) { addToast(`Erro ao criar transação de despesa: ${expenseError?.message}`, 'error'); return; }
        linkedExpenseTxId = expenseTx.id;
        setTransactions(prev => [expenseTx as Transaction, ...prev]);
    }
    let linkedInstallmentPurchaseId: string | undefined = undefined;
    if (loanData.funding_source === 'creditCard' && loanData.cost_on_credit_card && loanData.linked_credit_card_id && ccInstallmentsFromForm) {
        const ipData: Omit<InstallmentPurchase, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            credit_card_id: loanData.linked_credit_card_id, description: `Empréstimo (crédito) para ${loanData.person_name}`,
            purchase_date: loanData.loan_date, total_amount: loanData.cost_on_credit_card,
            number_of_installments: ccInstallmentsFromForm, installments_paid: 0,
        };
        const {data: newIp, error: ipError} = await supabase.from('installment_purchases').insert({...ipData, user_id: user.id, profile_id: activeUserProfile.id}).select().single();
        if(ipError || !newIp) {addToast(`Erro ao criar compra parcelada: ${ipError?.message}`, 'error'); return;}
        linkedInstallmentPurchaseId = newIp.id;
        setInstallmentPurchases(prev => [newIp as InstallmentPurchase, ...prev]);
    }

    const finalLoanData = { ...loanData, user_id: user.id, profile_id: activeUserProfile.id, linked_expense_transaction_id: linkedExpenseTxId, linked_installment_purchase_id: linkedInstallmentPurchaseId };
    const { data, error } = await supabase.from('loans').insert(finalLoanData).select().single();
    if(error) { addToast(`Erro ao adicionar empréstimo: ${error.message}`, 'error');}
    else if (data) { setLoans(prev => [data as Loan, ...prev]); addToast('Empréstimo adicionado!', 'success');}
  };
  const handleUpdateLoan = async (updatedLoanData: Omit<Loan, 'user_id'|'profile_id'|'created_at'|'updated_at'|'linked_expense_transaction_id'|'linked_installment_purchase_id'> & { id: string }) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('loans').update({...updatedLoanData, profile_id: activeUserProfile.id}).eq('id', updatedLoanData.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if(error) { addToast(`Erro ao atualizar empréstimo: ${error.message}`, 'error');}
    else if (data) { setLoans(prev => prev.map(l => l.id === data.id ? data as Loan : l)); addToast('Empréstimo atualizado!', 'success');}
  };
  const handleDeleteLoan = async (loanId: string) => {
    if (!user || !activeUserProfile) return;
    const loanToDelete = loans.find(l => l.id === loanId);
    if (loanToDelete) {
        if (loanToDelete.linked_expense_transaction_id) await supabase.from('transactions').delete().eq('id', loanToDelete.linked_expense_transaction_id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
        if (loanToDelete.linked_installment_purchase_id) await supabase.from('installment_purchases').delete().eq('id', loanToDelete.linked_installment_purchase_id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
    }
    const { error } = await supabase.from('loans').delete().eq('id', loanId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
    if(error) { addToast(`Erro ao excluir empréstimo: ${error.message}`, 'error');}
    else { setLoans(prev => prev.filter(l => l.id !== loanId)); setLoanRepayments(prev => prev.filter(rp => rp.loan_id !== loanId)); addToast('Empréstimo excluído!', 'success');}
  };
  const handleAddLoanRepayment = async (repaymentData: Omit<LoanRepayment, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'|'linked_income_transaction_id'|'loan_id'>, loanId: string) => {
    if (!user || !activeUserProfile) return;
    const incTxData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
        type: TransactionType.INCOME, amount: repaymentData.amount_paid, date: repaymentData.repayment_date,
        description: `Recebimento empréstimo de ${loans.find(l=>l.id===loanId)?.person_name}`, account_id: repaymentData.credited_account_id,
    };
    const {data: incTx, error: incError} = await supabase.from('transactions').insert({...incTxData, user_id: user.id, profile_id: activeUserProfile.id}).select().single();
    if(incError || !incTx) { addToast(`Erro ao criar transação de receita: ${incError?.message}`, 'error'); return;}
    setTransactions(prev => [incTx as Transaction, ...prev]);
    
    const finalRepaymentData = { ...repaymentData, user_id: user.id, profile_id: activeUserProfile.id, loan_id: loanId, linked_income_transaction_id: incTx.id };
    const { data, error } = await supabase.from('loan_repayments').insert(finalRepaymentData).select().single();
    if(error) { addToast(`Erro ao adicionar pagamento: ${error.message}`, 'error');}
    else if (data) { setLoanRepayments(prev => [data as LoanRepayment, ...prev]); addToast('Pagamento recebido registrado!', 'success');}
  };

  const handleAddFuturePurchase = async (purchaseData: Omit<FuturePurchase, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'|'status' | 'ai_analysis' | 'ai_analyzed_at'>) => {
    if (!user || !activeUserProfile) return;
    const newPurchase = { ...purchaseData, user_id: user.id, profile_id: activeUserProfile.id, status: 'PLANNED' as FuturePurchaseStatus };
    const { data, error } = await supabase.from('future_purchases').insert(newPurchase).select().single();
    if(error) { addToast(`Erro: ${error.message}`, 'error');}
    else if(data) { setFuturePurchases(prev => [data as FuturePurchase, ...prev]); addToast('Compra futura adicionada!', 'success');}
  };
  const handleUpdateFuturePurchase = async (updatedPurchaseData: Omit<FuturePurchase, 'user_id'|'profile_id'|'created_at'|'updated_at'|'status' | 'ai_analysis' | 'ai_analyzed_at'> & { id: string }) => {
    if (!user || !activeUserProfile) return;
    const finalUpdateData = {...updatedPurchaseData, profile_id: activeUserProfile.id };
    const { data, error } = await supabase.from('future_purchases').update(finalUpdateData).eq('id', finalUpdateData.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if(error) { addToast(`Erro: ${error.message}`, 'error');}
    else if(data) { setFuturePurchases(prev => prev.map(p => p.id === data.id ? data as FuturePurchase : p)); addToast('Compra futura atualizada!', 'success');}
  };
  const handleDeleteFuturePurchase = async (purchaseId: string) => {
    if (!user || !activeUserProfile) return;
    if (window.confirm('Excluir esta compra futura?')) {
      const { error } = await supabase.from('future_purchases').delete().eq('id', purchaseId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
      if(error) { addToast(`Erro: ${error.message}`, 'error');}
      else { setFuturePurchases(prev => prev.filter(p => p.id !== purchaseId)); addToast('Compra futura excluída!', 'success');}
    }
  };

   const handleUpdateAIInsight = async (updatedInsight: AIInsight) => {
     if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('ai_insights').update({is_read: updatedInsight.is_read, profile_id: activeUserProfile.id}).eq('id', updatedInsight.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if (error) { addToast(`Erro ao atualizar insight: ${error.message}`, 'error'); }
    else if (data) { setAiInsights(prev => prev.map(i => i.id === data.id ? data as AIInsight : i).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));}
  };
  
  const handleAddDebt = async (debtData: Omit<Debt, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'>) => {
    if (!user || !activeUserProfile) return;
    const newDebt = { ...debtData, user_id: user.id, profile_id: activeUserProfile.id, current_balance: debtData.initial_balance, is_archived: false };
    const { data, error } = await supabase.from('debts').insert(newDebt).select().single();
    if(error) { addToast(`Erro: ${error.message}`, 'error');}
    else if(data) { setDebts(prev => [data as Debt, ...prev].sort((a,b)=>a.name.localeCompare(b.name))); addToast('Dívida adicionada!', 'success');}
  };

  const handleUpdateDebt = async (updatedDebtData: Debt) => {
    if (!user || !activeUserProfile) return;
    const { data, error } = await supabase.from('debts').update({...updatedDebtData, profile_id: activeUserProfile.id}).eq('id', updatedDebtData.id).eq('user_id', user.id).eq('profile_id', activeUserProfile.id).select().single();
    if(error) { addToast(`Erro: ${error.message}`, 'error');}
    else if(data) { setDebts(prev => prev.map(d => d.id === data.id ? data as Debt : d).sort((a,b)=>a.name.localeCompare(b.name))); addToast('Dívida atualizada!', 'success');}
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!user || !activeUserProfile) return;
    if (window.confirm('Excluir esta dívida?')) {
      const { error } = await supabase.from('debts').delete().eq('id', debtId).eq('user_id', user.id).eq('profile_id', activeUserProfile.id);
      if(error) { addToast(`Erro: ${error.message}`, 'error');}
      else { setDebts(prev => prev.filter(d => d.id !== debtId)); setDebtPayments(prev => prev.filter(dp => dp.debt_id !== debtId)); addToast('Dívida excluída!', 'success');}
    }
  };

  const handleAddDebtPayment = async (
    paymentData: Omit<DebtPayment, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id'>,
    createLinkedExpense: boolean,
    linkedAccountId?: string
  ) => {
    if (!user || !activeUserProfile) return;
    let linkedTxId: string | undefined = undefined;
    if(createLinkedExpense && linkedAccountId) {
        const debtDetails = debts.find(d => d.id === paymentData.debt_id);
        const expenseTxData: Omit<Transaction, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
            type: TransactionType.EXPENSE, amount: paymentData.amount_paid, date: paymentData.payment_date,
            description: `Pagamento Dívida: ${debtDetails?.name || 'Dívida'}`, account_id: linkedAccountId,
            category_id: categories.find(c => c.name.toLowerCase().includes("pagamento de dívida") || c.name.toLowerCase().includes("empréstimo"))?.id
        };
        const { data: expenseTx, error: expenseError } = await supabase.from('transactions').insert({...expenseTxData, user_id: user.id, profile_id: activeUserProfile.id}).select().single();
        if(expenseError || !expenseTx) { addToast(`Erro ao criar despesa vinculada: ${expenseError?.message}`, 'error'); return;}
        linkedTxId = expenseTx.id;
        setTransactions(prev => [expenseTx as Transaction, ...prev]);
    }
    const newPayment = { ...paymentData, user_id: user.id, profile_id: activeUserProfile.id, linked_expense_transaction_id: linkedTxId };
    const { data: savedPayment, error: paymentError } = await supabase.from('debt_payments').insert(newPayment).select().single();
    if(paymentError) { addToast(`Erro: ${paymentError.message}`, 'error');}
    else if(savedPayment) { 
        setDebtPayments(prev => [savedPayment as DebtPayment, ...prev]);
        setDebts(prevDebts => prevDebts.map(d => {
            if (d.id === savedPayment.debt_id) {
                return { ...d, current_balance: d.current_balance - savedPayment.amount_paid };
            }
            return d;
        }));
        addToast('Pagamento de dívida registrado!', 'success');
    }
  };

  const handleFetchDebtStrategyExplanation = useCallback(async (strategy: DebtStrategy) => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
      timestamp: new Date().toISOString(), type: 'debt_strategy_explanation',
      content: `Buscando explicação para a estratégia: ${strategy}...`,
      related_debt_strategy: strategy, is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, profile_id: activeUserProfile!.id, created_at: '', updated_at: ''}, ...prev]);

    const insight = await geminiService.fetchDebtStrategyExplanation(strategy);
    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (insight) handleAddAIInsight(insight);
    else addToast(`Não foi possível buscar explicação para a estratégia ${strategy}`, 'warning');
  }, [user, activeUserProfile, aiConfig.isEnabled, aiConfig.apiKeyStatus, handleAddAIInsight, addToast]);

  const handleFetchDebtProjectionSummary = useCallback(async (projection: DebtProjection, debtsForSummary: Debt[], strategy: DebtStrategy) => {
    if (!user || !activeUserProfile || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    const context = generateFinancialContext();
    if (!context) return;
    const loadingInsight: Omit<AIInsight, 'id'|'user_id'|'profile_id'|'created_at'|'updated_at'> = {
      timestamp: new Date().toISOString(), type: 'debt_projection_summary',
      content: `Gerando resumo da projeção de dívidas...`,
       related_debt_strategy: strategy, is_read: false, isLoading: true,
    };
    const clientSideLoadingId = generateClientSideId();
    setAiInsights(prev => [{...loadingInsight, id: clientSideLoadingId, user_id: user.id, profile_id: activeUserProfile!.id, created_at: '', updated_at: ''}, ...prev]);
    
    const insight = await geminiService.fetchDebtProjectionSummary(projection, debtsForSummary, context);
    setAiInsights(prev => prev.filter(i => i.id !== clientSideLoadingId));
    if (insight) handleAddAIInsight(insight);
    else addToast(`Não foi possível gerar resumo da projeção.`, 'warning');
  }, [user, activeUserProfile, aiConfig.isEnabled, aiConfig.apiKeyStatus, generateFinancialContext, handleAddAIInsight, addToast]);


  // --- UI State and Rendering ---
  const NavItem: React.FC<{
    label: string; currentView: AppView; targetView: AppView; icon: JSX.Element; action: (view: AppView) => void;
  }> = ({ label, currentView, targetView, icon, action }) => (
    <li>
      <button
        onClick={() => action(targetView)}
        className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-colors duration-150
                    ${currentView === targetView
                        ? 'bg-primary/10 dark:bg-primaryDark/20 text-primary dark:text-primaryDark font-semibold shadow-sm'
                        : 'text-textMuted dark:text-textMutedDark hover:bg-neutral/10 dark:hover:bg-neutralDark/20 hover:text-textBase dark:hover:text-textBaseDark'
                    }`}
        aria-current={currentView === targetView ? 'page' : undefined}
      >
        {React.cloneElement(icon, { className: "w-5 h-5 mr-3 flex-shrink-0" })}
        {label}
      </button>
    </li>
  );

  const Sidebar = () => (
    <aside className="w-64 bg-surface dark:bg-surfaceDark p-4 border-r border-borderBase dark:border-borderBaseDark flex flex-col justify-between shadow-md print:hidden">
      <div>
        <div className="px-3 mb-6">
          <h2 className="text-xl font-bold text-primary dark:text-primaryDark tracking-tight">{APP_NAME}</h2>
          <p className="text-xs text-textMuted dark:text-textMutedDark">Perfil: {activeUserDisplayName}</p>
        </div>
        <nav>
          <ul className="space-y-1.5">
            <NavItem label="Painel Geral" currentView={activeView} targetView="DASHBOARD" icon={<ChartPieIcon />} action={setActiveView} />
            <NavItem label="Transações" currentView={activeView} targetView="TRANSACTIONS" icon={<ListBulletIcon />} action={setActiveView} />
            <NavItem label="Contas" currentView={activeView} targetView="ACCOUNTS" icon={<BanknotesIcon />} action={setActiveView} />
            <NavItem label="Cartões" currentView={activeView} targetView="CREDIT_CARDS" icon={<CreditCardIcon />} action={setActiveView} />
            <NavItem label="Categorias" currentView={activeView} targetView="CATEGORIES" icon={<TagIcon />} action={setActiveView} />
            <NavItem label="Caixinhas" currentView={activeView} targetView="MONEY_BOXES" icon={<PiggyBankIcon />} action={setActiveView} />
            <NavItem label="Recorrências" currentView={activeView} targetView="RECURRING_TRANSACTIONS" icon={<ArrowPathIcon />} action={setActiveView} />
            <NavItem label="Empréstimos" currentView={activeView} targetView="LOANS" icon={<UsersIcon />} action={setActiveView} />
            <NavItem label="Compras Futuras" currentView={activeView} targetView="FUTURE_PURCHASES" icon={<ShoppingCartIcon />} action={setActiveView} />
            <NavItem label="Planejar Dívidas" currentView={activeView} targetView="DEBT_PLANNER" icon={<BanknotesIcon />} action={setActiveView} />
            <NavItem label="Tags" currentView={activeView} targetView="TAGS" icon={<BookmarkSquareIcon />} action={setActiveView} />
            <NavItem label="AI Coach" currentView={activeView} targetView="AI_COACH" icon={<ChatBubbleLeftRightIcon />} action={setActiveView} />
            <NavItem label="Dados" currentView={activeView} targetView="DATA_MANAGEMENT" icon={<CogIcon />} action={setActiveView} />
          </ul>
        </nav>
      </div>
      <div className="mt-auto space-y-3 pt-4 border-t border-borderBase dark:border-borderBaseDark">
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
         <Button variant="ghost" onClick={togglePrivacyMode} className="w-full !justify-start text-textMuted dark:text-textMutedDark">
          {isPrivacyModeEnabled ? <EyeSlashIcon className="w-5 h-5 mr-2" /> : <EyeIcon className="w-5 h-5 mr-2" />}
          Modo Privacidade {isPrivacyModeEnabled ? 'Ativado' : 'Desativado'}
        </Button>
        <Button variant="ghost" onClick={() => { 
            setActiveUserProfile(null); 
            setInitialProfilesLoaded(false); 
            setIsLoadingProfiles(true); 
            setIsLoadingData(true); 
            if(user) fetchUserProfiles(user.id); 
        }} className="w-full !justify-start text-textMuted dark:text-textMutedDark">
            <UserCircleIcon className="w-5 h-5 mr-2" /> Trocar Perfil
        </Button>
        <Button variant="ghost" onClick={handleSignOut} className="w-full !justify-start text-destructive dark:text-destructiveDark">
          <PowerIcon className="w-5 h-5 mr-2" /> Sair
        </Button>
      </div>
    </aside>
  );

  const Header = () => (
    <header className="bg-surface dark:bg-surfaceDark p-4 border-b border-borderBase dark:border-borderBaseDark flex justify-between items-center print:hidden">
      <h1 className="text-xl font-semibold text-textBase dark:text-textBaseDark">{activeView.replace(/_/g, ' ')}</h1>
      <Button onClick={() => { setEditingTransaction(null); setIsTransactionModalOpen(true); }} variant="primary">
        <PlusIcon className="w-5 h-5 mr-2" /> Nova Transação
      </Button>
    </header>
  );


  const renderView = () => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardView transactions={transactions} accounts={accounts} categories={categories} creditCards={creditCards} installmentPurchases={installmentPurchases} moneyBoxes={moneyBoxes} loans={loans} loanRepayments={loanRepayments} recurringTransactions={recurringTransactions} onAddTransaction={() => {setEditingTransaction(null); setIsTransactionModalOpen(true);}} calculateAccountBalance={calculateAccountBalance} calculateMoneyBoxBalance={calculateMoneyBoxBalance} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'TRANSACTIONS': return <TransactionsView transactions={transactions} accounts={accounts} categories={categories} tags={tags} installmentPurchases={installmentPurchases} onAddTransaction={() => {setEditingTransaction(null); setIsTransactionModalOpen(true);}} onEditTransaction={(tx) => {setEditingTransaction(tx); setIsTransactionModalOpen(true);}} onDeleteTransaction={handleDeleteTransaction} isLoading={isLoadingData && !activeUserProfile} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'ACCOUNTS': return <AccountsView accounts={accounts} transactions={transactions} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount} calculateAccountBalance={calculateAccountBalance} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'CATEGORIES': return <CategoriesView categories={categories} transactions={transactions} aiConfig={aiConfig} onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onSuggestBudget={handleSuggestCategoryBudget} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'CREDIT_CARDS': return <CreditCardsView creditCards={creditCards} installmentPurchases={installmentPurchases} aiConfig={aiConfig} onAddCreditCard={handleAddCreditCard} onUpdateCreditCard={handleUpdateCreditCard} onDeleteCreditCard={handleDeleteCreditCard} onAddInstallmentPurchase={handleAddInstallmentPurchase} onUpdateInstallmentPurchase={handleUpdateInstallmentPurchase} onDeleteInstallmentPurchase={handleDeleteInstallmentPurchase} onMarkInstallmentPaid={handleMarkInstallmentPaid} onPayMonthlyInstallments={handlePayMonthlyInstallments} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'MONEY_BOXES': return <MoneyBoxesView moneyBoxes={moneyBoxes} moneyBoxTransactions={moneyBoxTransactions} accounts={accounts} onAddMoneyBox={handleAddMoneyBox} onUpdateMoneyBox={handleUpdateMoneyBox} onDeleteMoneyBox={handleDeleteMoneyBox} onAddMoneyBoxTransaction={handleAddMoneyBoxTransaction} onDeleteMoneyBoxTransaction={handleDeleteMoneyBoxTransaction} calculateMoneyBoxBalance={calculateMoneyBoxBalance} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'FUTURE_PURCHASES': return <FuturePurchasesView futurePurchases={futurePurchases} onAddFuturePurchase={handleAddFuturePurchase} onUpdateFuturePurchase={handleUpdateFuturePurchase} onDeleteFuturePurchase={handleDeleteFuturePurchase} onAnalyzeFuturePurchase={handleAnalyzeFuturePurchase} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'TAGS': return <TagsView tags={tags} transactions={transactions} onAddTag={handleAddTag} onUpdateTag={handleUpdateTag} onDeleteTag={handleDeleteTag} />;
      case 'RECURRING_TRANSACTIONS': return <RecurringTransactionsView recurringTransactions={recurringTransactions} accounts={accounts} categories={categories} onAddRecurringTransaction={handleAddRecurringTransaction} onUpdateRecurringTransaction={handleUpdateRecurringTransaction} onDeleteRecurringTransaction={handleDeleteRecurringTransaction} onProcessRecurringTransactions={handleProcessRecurringTransactions} isPrivacyModeEnabled={isPrivacyModeEnabled}/>;
      case 'LOANS': return <LoansView loans={loans} loanRepayments={loanRepayments} accounts={accounts} creditCards={creditCards} onAddLoan={handleAddLoan} onUpdateLoan={handleUpdateLoan} onDeleteLoan={handleDeleteLoan} onAddLoanRepayment={handleAddLoanRepayment} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'DEBT_PLANNER': return <DebtPlannerView debts={debts} debtPayments={debtPayments} accounts={accounts} onAddDebt={handleAddDebt} onUpdateDebt={handleUpdateDebt} onDeleteDebt={handleDeleteDebt} onAddDebtPayment={handleAddDebtPayment} onFetchDebtStrategyExplanation={handleFetchDebtStrategyExplanation} onFetchDebtProjectionSummary={handleFetchDebtProjectionSummary} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
      case 'AI_COACH': return <AICoachView aiConfig={aiConfig} setAiConfig={updateAiConfig} insights={aiInsights} onFetchGeneralAdvice={handleFetchGeneralAIAdvice} onUpdateInsight={handleUpdateAIInsight} isPrivacyModeEnabled={isPrivacyModeEnabled} onFetchRecurringPaymentCandidates={handleFetchRecurringPaymentCandidates} onFetchSavingOpportunities={handleFetchSavingOpportunities} onFetchCashFlowProjection={handleFetchCashFlowProjection} />;
      case 'DATA_MANAGEMENT':
        const userPrefsToExport: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'> = {
            id: currentUserPreferences?.id || '', // Ensure ID is present
            profile_id: activeUserProfile!.id, 
            theme: theme,
            is_privacy_mode_enabled: isPrivacyModeEnabled,
            ai_is_enabled: aiConfig.isEnabled,
            ai_monthly_income: aiConfig.monthlyIncome,
            ai_auto_backup_enabled: aiConfig.autoBackupToFileEnabled
        };
        return <DataManagementView allData={{transactions, accounts, categories, creditCards, installmentPurchases, moneyBoxes, moneyBoxTransactions, futurePurchases, tags, recurringTransactions, loans, loanRepayments, aiInsights, debts, debtPayments }} userPreferencesToExport={userPrefsToExport} activeProfileName={activeUserDisplayName} user={user} />;
      default:
        addToast("Visualização não encontrada, redirecionando para o Painel.", "warning");
        setActiveView('DASHBOARD');
        return <DashboardView transactions={transactions} accounts={accounts} categories={categories} creditCards={creditCards} installmentPurchases={installmentPurchases} moneyBoxes={moneyBoxes} loans={loans} loanRepayments={loanRepayments} recurringTransactions={recurringTransactions} onAddTransaction={() => {setEditingTransaction(null); setIsTransactionModalOpen(true);}} calculateAccountBalance={calculateAccountBalance} calculateMoneyBoxBalance={calculateMoneyBoxBalance} isPrivacyModeEnabled={isPrivacyModeEnabled} />;
    }
  };

  const LoadingScreen: React.FC<{message?: string}> = ({message = "Carregando..."}) => (
     <div className="flex items-center justify-center h-screen bg-background dark:bg-backgroundDark">
        <div className="p-6 bg-surface dark:bg-surfaceDark rounded-lg shadow-xl text-center">
          <ArrowPathIcon className="w-10 h-10 text-primary dark:text-primaryDark mx-auto animate-spin mb-3" />
          <p className="text-lg text-textMuted dark:text-textMutedDark">{message}</p>
        </div>
      </div>
  );

  if (isLoadingSession) return <LoadingScreen message="Carregando sessão..." />;
  
  if (user && (isLoadingProfiles || !initialProfilesLoaded)) {
    return <LoadingScreen message="Carregando perfis..." />;
  }
  
  if (!user) return <LoginView onLoginWithGoogle={handleSignInWithGoogle} isLoading={isLoadingSession} />;
  
  if (user && !activeUserProfile && initialProfilesLoaded && !isLoadingProfiles) { 
      return <ProfileSelectionView profiles={availableProfiles} onSelectProfile={(profileId) => handleSelectProfile(profileId, availableProfiles)} onCreateProfile={handleCreateProfile} />;
  }
  
  if (user && activeUserProfile && isLoadingData) {
    return <LoadingScreen message={`Carregando dados para ${activeUserDisplayName}...`} />;
  }
  
  if (user && !activeUserProfile) {
     return <ProfileSelectionView profiles={availableProfiles} onSelectProfile={(profileId) => handleSelectProfile(profileId, availableProfiles)} onCreateProfile={handleCreateProfile} />;
  }


  return (
    <div className={`flex h-screen bg-background dark:bg-backgroundDark text-textBase dark:text-textBaseDark print:block`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-0 bg-background dark:bg-backgroundDark print:overflow-visible">
          {renderView()}
        </main>
      </div>

      {isTransactionModalOpen && activeUserProfile && (
        <Modal
          isOpen={isTransactionModalOpen}
          onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }}
          title={editingTransaction ? 'Editar Transação' : 'Nova Transação'}
          size="lg"
        >
          <TransactionForm
            onSubmit={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
            onCancel={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }}
            accounts={accounts}
            creditCards={creditCards}
            categories={categories}
            tags={tags}
            initialTransaction={editingTransaction}
            isPrivacyModeEnabled={isPrivacyModeEnabled}
          />
        </Modal>
      )}
    </div>
  );
};

const App = (): JSX.Element => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;