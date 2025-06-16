import React from 'react';
import { useState, useEffect, useCallback, useMemo }from 'react'; 
import { 
  TransactionType, 
  Transaction, 
  Account, 
  Category, 
  CreditCard, 
  MoneyBox, 
  FuturePurchase, 
  Tag, 
  RecurringTransaction, 
  Loan, 
  Profile,
  AppView,
  MoneyBoxTransaction,
  MoneyBoxTransactionType,
  Theme,
  RecurringTransactionFrequency,
  LoanRepayment,
  AIConfig,
  AIInsight,
  UserProfile,
  InstallmentPurchase
} from './types';
import { APP_NAME, getInitialCategories, getInitialAccounts } from './constants';
import { generateId, getISODateString, formatDate, formatCurrency } from './utils/helpers'; 
import useLocalStorage from './hooks/useLocalStorage';

// Views
import DashboardView from './components/DashboardView';
import TransactionsView from './components/TransactionsView';
import AccountsView from './components/AccountsView';
import CategoriesView from './components/CategoriesView';
import CreditCardsView from './components/CreditCardsView';
import MoneyBoxesView from './components/MoneyBoxesView';
import FuturePurchasesView from './components/FuturePurchasesView'; // New
import DataManagementView from './components/DataManagementView';
import TagsView from './components/TagsView'; 
import RecurringTransactionsView from './components/RecurringTransactionsView'; 
import LoansView from './components/LoansView'; 
import AICoachView from './components/AICoachView';
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
import ShoppingCartIcon from './components/icons/ShoppingCartIcon'; // New
import BookmarkSquareIcon from './components/icons/BookmarkSquareIcon'; 
import ArrowPathIcon from './components/icons/ArrowPathIcon'; 
import UsersIcon from './components/icons/UsersIcon'; 
import ChatBubbleLeftRightIcon from './components/icons/ChatBubbleLeftRightIcon';
import UserCircleIcon from './components/icons/UserCircleIcon'; 

// Services
import * as geminiService from './services/geminiService';
import type { FinancialContext } from './services/geminiService';


// Helper to generate profile-specific keys
const getProfileKey = (baseKey: string, profileId: string | null): string => {
  if (!profileId) {
    console.warn(`Attempting to generate key "${baseKey}" without an active profile.`);
    return `${baseKey}_NO_PROFILE_ACTIVE_STATE`; 
  }
  return `profile_${profileId}_${baseKey}`;
};


const App: React.FC = () => {
  // Profile Management State
  const [profiles, setProfiles] = useLocalStorage<UserProfile[]>('finapp_profiles_list', []);
  const [activeProfileId, setActiveProfileId] = useLocalStorage<string | null>('finapp_active_profile_id', null);
  const [isProfileSelectionOpen, setIsProfileSelectionOpen] = useState(false);
  
  // Data States
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(getProfileKey('finapp_transactions', activeProfileId), []);
  const [accounts, setAccounts] = useLocalStorage<Account[]>(getProfileKey('finapp_accounts', activeProfileId), getInitialAccounts);
  const [categories, setCategories] = useLocalStorage<Category[]>(getProfileKey('finapp_categories', activeProfileId), getInitialCategories);
  const [creditCards, setCreditCards] = useLocalStorage<CreditCard[]>(getProfileKey('finapp_creditCards', activeProfileId), []);
  const [installmentPurchases, setInstallmentPurchases] = useLocalStorage<InstallmentPurchase[]>(getProfileKey('finapp_installmentPurchases', activeProfileId), []);
  const [moneyBoxes, setMoneyBoxes] = useLocalStorage<MoneyBox[]>(getProfileKey('finapp_moneyBoxes', activeProfileId), []);
  const [moneyBoxTransactions, setMoneyBoxTransactions] = useLocalStorage<MoneyBoxTransaction[]>(getProfileKey('finapp_moneyBoxTransactions', activeProfileId), []);
  const [futurePurchases, setFuturePurchases] = useLocalStorage<FuturePurchase[]>(getProfileKey('finapp_future_purchases', activeProfileId), []); 
  const [tags, setTags] = useLocalStorage<Tag[]>(getProfileKey('finapp_tags', activeProfileId), []);
  const [recurringTransactions, setRecurringTransactions] = useLocalStorage<RecurringTransaction[]>(getProfileKey('finapp_recurringTransactions', activeProfileId), []);
  const [loans, setLoans] = useLocalStorage<Loan[]>(getProfileKey('finapp_loans', activeProfileId), []);
  const [loanRepayments, setLoanRepayments] = useLocalStorage<LoanRepayment[]>(getProfileKey('finapp_loanRepayments', activeProfileId), []);
  
  const [aiConfig, setAiConfig] = useLocalStorage<AIConfig>(getProfileKey('finapp_aiConfig', activeProfileId), {
    isEnabled: false,
    apiKeyStatus: 'unknown',
    monthlyIncome: null,
    autoBackupToFileEnabled: false, // Initialize new flag
  });
  const [aiInsights, setAiInsights] = useLocalStorage<AIInsight[]>(getProfileKey('finapp_aiInsights', activeProfileId), []);


  const [activeView, setActiveView] = useState<AppView>('DASHBOARD');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [theme, setTheme] = useLocalStorage<Theme>(getProfileKey('finapp_theme', activeProfileId), 'system');

  const activeProfileName = useMemo(() => {
    return profiles.find(p => p.id === activeProfileId)?.name || "Nenhum Perfil";
  }, [activeProfileId, profiles]);

  // Auto Backup Logic
  const handleExportDataToFile = useCallback(() => {
    if (!activeProfileId) return;
    const profileIdentifier = activeProfileName ? activeProfileName.replace(/\s+/g, '_') : 'perfil_desconhecido';
    const dataToExport = {
      profileName: activeProfileName || 'N/A', 
      exportedAt: new Date().toISOString(),
      transactions, accounts, categories, creditCards, installmentPurchases,
      moneyBoxes, moneyBoxTransactions, futurePurchases, tags, 
      recurringTransactions, loans, loanRepayments, 
      aiConfig: {isEnabled: aiConfig.isEnabled, monthlyIncome: aiConfig.monthlyIncome, autoBackupToFileEnabled: aiConfig.autoBackupToFileEnabled }, 
      aiInsights, theme, 
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro_pessoal_${profileIdentifier}_autobackup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Automatic backup to file triggered for profile:", activeProfileName);
  }, [
    activeProfileId, activeProfileName, transactions, accounts, categories, creditCards, 
    installmentPurchases, moneyBoxes, moneyBoxTransactions, futurePurchases, tags, 
    recurringTransactions, loans, loanRepayments, aiConfig, aiInsights, theme
  ]);

  const triggerAutoBackupIfEnabled = useCallback(() => {
    if (aiConfig.autoBackupToFileEnabled) {
      handleExportDataToFile();
    }
  }, [aiConfig.autoBackupToFileEnabled, handleExportDataToFile]);


  // Profile Management Logic
  useEffect(() => {
    if (!activeProfileId) {
      setIsProfileSelectionOpen(true);
      if (activeView !== 'PROFILE_SELECTION') setActiveView('PROFILE_SELECTION');
    } else {
      const currentProfileAccountsKey = getProfileKey('finapp_accounts', activeProfileId);
      const currentProfileCategoriesKey = getProfileKey('finapp_categories', activeProfileId);
      const currentProfileFuturePurchasesKey = getProfileKey('finapp_future_purchases', activeProfileId);
      const currentProfileAiConfigKey = getProfileKey('finapp_aiConfig', activeProfileId);


      if (localStorage.getItem(currentProfileAccountsKey) === null) {
          setAccounts(getInitialAccounts());
      }
      if (localStorage.getItem(currentProfileCategoriesKey) === null) {
          setCategories(getInitialCategories());
      }
      if (localStorage.getItem(currentProfileFuturePurchasesKey) === null) {
          setFuturePurchases([]); 
      }
      // Ensure aiConfig has the new autoBackupToFileEnabled flag if loading from older storage
      if (localStorage.getItem(currentProfileAiConfigKey)) {
        const storedAiConfig = JSON.parse(localStorage.getItem(currentProfileAiConfigKey)!);
        if (storedAiConfig.autoBackupToFileEnabled === undefined) {
          setAiConfig(prev => ({...prev, autoBackupToFileEnabled: false}));
        }
      }


      setIsProfileSelectionOpen(false);
      if (activeView === 'PROFILE_SELECTION') setActiveView('DASHBOARD');
    }
  }, [activeProfileId, profiles, setAccounts, setCategories, setFuturePurchases, setAiConfig, activeView]);


  const handleCreateProfile = (name: string) => {
    const newProfileId = generateId();
    const newProfile: UserProfile = { id: newProfileId, name };
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfileId); 
    setActiveView('DASHBOARD'); 
    setIsProfileSelectionOpen(false);
  };

  const handleSelectProfile = (profileId: string) => {
    setActiveProfileId(profileId); 
    setActiveView('DASHBOARD');
    setIsProfileSelectionOpen(false);
  };
  
  const handleSwitchProfileRequest = () => {
    setActiveView('PROFILE_SELECTION');
    setIsProfileSelectionOpen(true); 
  };

  useEffect(() => {
    const keyStatus = geminiService.isGeminiApiKeyAvailable() ? 'available' : 'unavailable';
    if (activeProfileId) {
      setAiConfig(prev => ({ ...prev, apiKeyStatus: keyStatus }));
    }

    const applyTheme = (currentTheme: Theme) => {
      if (currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme(theme); 
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, setAiConfig, activeProfileId]);

  const calculateAccountBalance = useCallback((accountId: string): number => {
    if (!activeProfileId) return 0;
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return 0;
    let balance = account.initialBalance;
    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME && t.accountId === accountId) balance += t.amount;
      else if (t.type === TransactionType.EXPENSE && t.accountId === accountId) balance -= t.amount;
      else if (t.type === TransactionType.TRANSFER) {
        if (t.accountId === accountId) balance -= t.amount;
        if (t.toAccountId === accountId) balance += t.amount;
      }
    });
    return balance;
  }, [accounts, transactions, activeProfileId]);

  const calculateMoneyBoxBalance = useCallback((moneyBoxId: string): number => {
    if (!activeProfileId) return 0;
    return moneyBoxTransactions.filter(t => t.moneyBoxId === moneyBoxId).reduce((bal, t) => bal + (t.type === MoneyBoxTransactionType.DEPOSIT ? t.amount : -t.amount), 0);
  }, [moneyBoxTransactions, activeProfileId]);

  const generateFinancialContext = useCallback((): FinancialContext => {
    if (!activeProfileId) { 
        return { currentDate: getISODateString(), accounts: [], accountBalances: [], categories: [], monthlyIncome: null, theme: 'light' };
    }
    return {
      currentDate: getISODateString(),
      accounts: accounts.map(a => ({ name: a.name, id: a.id })),
      accountBalances: accounts.map(a => ({ accountId: a.id, balance: calculateAccountBalance(a.id) })),
      categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type, monthlyBudget: c.monthlyBudget })),
      recentTransactions: transactions.slice(-10), 
      moneyBoxes: moneyBoxes.map(mb => ({ id: mb.id, name: mb.name, goalAmount: mb.goalAmount })),
      moneyBoxBalances: moneyBoxes.map(mb => ({ moneyBoxId: mb.id, balance: calculateMoneyBoxBalance(mb.id) })),
      futurePurchases: futurePurchases.map(fp => ({id: fp.id, name: fp.name, estimatedCost: fp.estimatedCost, priority: fp.priority, status: fp.status })),
      loans: loans.map(l => ({id: l.id, personName: l.personName, totalAmountToReimburse: l.totalAmountToReimburse})),
      outstandingLoanBalances: loans.map(l => {
        const paid = loanRepayments.filter(rp => l.repaymentIds.includes(rp.id)).reduce((sum, rp) => sum + rp.amountPaid, 0);
        return { loanId: l.id, outstanding: l.totalAmountToReimburse - paid };
      }),
      recurringTransactions: recurringTransactions.filter(rt => !rt.isPaused).map(rt => ({id: rt.id, description: rt.description, amount: rt.amount, type: rt.type, nextDueDate: rt.nextDueDate })),
      theme: theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme,
      monthlyIncome: aiConfig.monthlyIncome, 
    };
  }, [accounts, categories, moneyBoxes, futurePurchases, loans, loanRepayments, recurringTransactions, transactions, theme, aiConfig.monthlyIncome, calculateAccountBalance, calculateMoneyBoxBalance, activeProfileId]);


  const handleFetchGeneralAIAdvice = useCallback(async () => {
    if (!activeProfileId || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    
    const loadingInsight: AIInsight = {
      id: generateId(), timestamp: new Date().toISOString(), type: 'general_advice',
      content: "Buscando novo conselho...", isRead: false, isLoading: true,
    };
    setAiInsights(prev => [loadingInsight, ...prev.filter(i => !i.isLoading)]);

    const context = generateFinancialContext();
    const advice = await geminiService.fetchGeneralAdvice(context);
    
    setAiInsights(prev => prev.map(i => i.id === loadingInsight.id ? (advice || { ...loadingInsight, content: "Não foi possível obter um conselho geral no momento.", type: 'error_message', isLoading: false }) : i ));
    triggerAutoBackupIfEnabled();
  }, [aiConfig.isEnabled, aiConfig.apiKeyStatus, setAiInsights, generateFinancialContext, activeProfileId, triggerAutoBackupIfEnabled]);

  const handleGenerateCommentForTransaction = useCallback(async (transaction: Transaction) => {
    if (!activeProfileId || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') return;
    
    const loadingInsight: AIInsight = {
        id: generateId(), timestamp: new Date().toISOString(), type: 'transaction_comment',
        content: `Analisando transação: ${transaction.description || transaction.type}...`,
        relatedTransactionId: transaction.id, isRead: false, isLoading: true,
      };
    setAiInsights(prev => [loadingInsight, ...prev.filter(i => !i.isLoading)]);

    const context = generateFinancialContext();
    const categoryName = transaction.categoryId ? categories.find(c => c.id === transaction.categoryId)?.name : undefined;
    const accountName = accounts.find(a => a.id === transaction.accountId)?.name;
    const comment = await geminiService.fetchCommentForTransaction(transaction, context, categoryName, accountName);

    setAiInsights(prev => prev.map(i => i.id === loadingInsight.id ? (comment || { ...loadingInsight, content: "Não foi possível gerar um comentário para esta transação.", type: 'error_message', isLoading: false }) : i ));
    triggerAutoBackupIfEnabled();
  }, [aiConfig.isEnabled, aiConfig.apiKeyStatus, categories, accounts, setAiInsights, generateFinancialContext, activeProfileId, triggerAutoBackupIfEnabled]);

  const handleSuggestCategoryBudget = useCallback(async (
    categoryName: string, 
    currentExpenseBudgets: {name: string, budget?: number}[]
  ): Promise<number | null> => {
    if (!activeProfileId || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available' || !aiConfig.monthlyIncome) {
        const errorMsg = !aiConfig.monthlyIncome 
            ? "Por favor, informe sua renda mensal na tela do AI Coach para receber sugestões de orçamento."
            : "AI Coach desativado ou API indisponível.";
        setAiInsights(prev => [{
            id: generateId(), timestamp: new Date().toISOString(), type: 'error_message',
            content: errorMsg, isRead: false,
        }, ...prev.filter(i => !i.isLoading)]);
        return null;
    }

    const loadingInsight: AIInsight = {
      id: generateId(), timestamp: new Date().toISOString(), type: 'budget_recommendation',
      content: `Calculando sugestão de orçamento para ${categoryName}...`, 
      relatedCategoryId: categories.find(c=>c.name === categoryName)?.id, 
      isRead: false, isLoading: true,
    };
    setAiInsights(prev => [loadingInsight, ...prev.filter(i => !i.isLoading)]);

    const context = generateFinancialContext();
    const result = await geminiService.fetchBudgetSuggestion(categoryName, aiConfig.monthlyIncome, currentExpenseBudgets, context);

    if (result && 'suggestedBudget' in result && typeof result.suggestedBudget === 'number') {
        const successInsight: AIInsight = {
            id: loadingInsight.id, 
            timestamp: new Date().toISOString(), type: 'budget_recommendation',
            content: `Com base na sua renda, sugiro um orçamento de ${formatCurrency(result.suggestedBudget)} para ${categoryName}.`,
            relatedCategoryId: categories.find(c=>c.name === categoryName)?.id,
            isRead: false, isLoading: false,
        };
        setAiInsights(prev => prev.map(i => i.id === loadingInsight.id ? successInsight : i));
        triggerAutoBackupIfEnabled();
        return result.suggestedBudget;
    } else if (result && 'content' in result) { 
         setAiInsights(prev => prev.map(i => i.id === loadingInsight.id ? {...result, isLoading: false} : i));
    } else {
        const errorInsight: AIInsight = {
            id: loadingInsight.id, 
            timestamp: new Date().toISOString(), type: 'error_message',
            content: `Não foi possível obter uma sugestão de orçamento para ${categoryName} no momento.`,
            relatedCategoryId: categories.find(c=>c.name === categoryName)?.id,
            isRead: false, isLoading: false,
        };
        setAiInsights(prev => prev.map(i => i.id === loadingInsight.id ? errorInsight : i));
    }
    return null;
  }, [aiConfig.isEnabled, aiConfig.apiKeyStatus, aiConfig.monthlyIncome, categories, setAiInsights, generateFinancialContext, activeProfileId, triggerAutoBackupIfEnabled]);

  const handleAnalyzeFuturePurchase = useCallback(async (purchaseId: string) => {
    if (!activeProfileId || !aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') {
      alert("AI Coach desabilitado ou API Key não configurada.");
      return;
    }
    const purchase = futurePurchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'AI_ANALYZING' } : p));
    
    const loadingInsight: AIInsight = {
      id: generateId(), timestamp: new Date().toISOString(), type: 'future_purchase_advice',
      content: `Analisando a compra: "${purchase.name}"...`, 
      relatedFuturePurchaseId: purchase.id, isRead: false, isLoading: true,
    };
    setAiInsights(prev => [loadingInsight, ...prev.filter(i => !i.isLoading)]);

    const context = generateFinancialContext();
    const analysisResult = await geminiService.fetchFuturePurchaseAnalysis(purchase, context);

    if (analysisResult && 'analysisText' in analysisResult && 'recommendedStatus' in analysisResult) {
      setFuturePurchases(prev => prev.map(p => 
        p.id === purchaseId 
        ? { ...p, status: analysisResult.recommendedStatus, aiAnalysis: analysisResult.analysisText, aiAnalyzedAt: new Date().toISOString() } 
        : p
      ));
      setAiInsights(prev => prev.map(i => i.id === loadingInsight.id ? {
        ...loadingInsight, 
        content: analysisResult.analysisText,
        type: 'future_purchase_advice',
        isLoading: false,
      } : i));
    } else if (analysisResult && 'content' in analysisResult) { // It's an AIInsight error message
        setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: p.status === 'AI_ANALYZING' ? 'PLANNED' : p.status } : p)); // Revert status
        setAiInsights(prev => prev.map(i => i.id === loadingInsight.id ? { ...analysisResult, isLoading: false, relatedFuturePurchaseId: purchase.id } : i));
    } else {
         setFuturePurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: p.status === 'AI_ANALYZING' ? 'PLANNED' : p.status } : p)); // Revert status
         setAiInsights(prev => prev.map(i => i.id === loadingInsight.id ? {
            ...loadingInsight, 
            content: `Não foi possível analisar a compra "${purchase.name}" no momento.`, 
            type: 'error_message', 
            isLoading: false
        } : i));
    }
    triggerAutoBackupIfEnabled();
  }, [aiConfig.isEnabled, aiConfig.apiKeyStatus, futurePurchases, setFuturePurchases, setAiInsights, generateFinancialContext, activeProfileId, triggerAutoBackupIfEnabled]);


  const handleAddTransaction = (transaction: Transaction) => {
    if (!activeProfileId) return;
    setTransactions(prev => [...prev, transaction]);
    setIsTransactionModalOpen(false);
    handleGenerateCommentForTransaction(transaction);
    triggerAutoBackupIfEnabled();
  };
  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    if (!activeProfileId) return;
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    setIsTransactionModalOpen(false); setEditingTransaction(null);
    handleGenerateCommentForTransaction(updatedTransaction);
    triggerAutoBackupIfEnabled();
  };
  const handleDeleteTransaction = (transactionId: string) => {
    if (!activeProfileId) return;
    if (window.confirm('Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.')) {
      const linkedMbTransaction = moneyBoxTransactions.find(mbt => mbt.linkedTransactionId === transactionId);
      if (linkedMbTransaction) {
        setMoneyBoxTransactions(prevMbts => prevMbts.map(mbt => 
            mbt.id === linkedMbTransaction.id ? { ...mbt, linkedTransactionId: undefined, linkedAccountId: undefined } : mbt
        ));
      }
      const isLinkedToLoanFunding = loans.some(l => l.linkedExpenseTransactionId === transactionId);
      const isLinkedToLoanRepayment = loanRepayments.some(rp => rp.linkedIncomeTransactionId === transactionId);
      if (isLinkedToLoanFunding) {
         setLoans(prevLoans => prevLoans.map(l => {
             if (l.linkedExpenseTransactionId === transactionId) return {...l, linkedExpenseTransactionId: undefined, linkedAccountId: undefined};
             return l;
         }));
      }
       if (isLinkedToLoanRepayment) {
         setLoanRepayments(prevRps => prevRps.map(rp => {
             if (rp.linkedIncomeTransactionId === transactionId) return {...rp, linkedIncomeTransactionId: 'DELETED_TX_'+transactionId};
             return rp;
         }));
      }
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      triggerAutoBackupIfEnabled();
    }
  };
  const openTransactionModalForNew = () => { setEditingTransaction(null); setIsTransactionModalOpen(true); };
  const openTransactionModalForEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setIsTransactionModalOpen(true); };

  const handleAddAccount = (account: Account) => { if (activeProfileId) setAccounts(prev => [...prev, account]); triggerAutoBackupIfEnabled();};
  const handleUpdateAccount = (updatedAccount: Account) => { if (activeProfileId) setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)); triggerAutoBackupIfEnabled();};
  const handleDeleteAccount = (accountId: string) => {
    if (!activeProfileId) return;
     if (transactions.some(t => t.accountId === accountId || t.toAccountId === accountId)) { alert("Não é possível excluir contas com transações. Remova ou reatribua as transações primeiro."); return; }
     if (moneyBoxTransactions.some(mbt => mbt.linkedAccountId === accountId)) { alert("Esta conta está vinculada a transações de caixinhas. Remova esses vínculos primeiro."); return; }
     if (recurringTransactions.some(rt => rt.accountId === accountId || rt.toAccountId === accountId)) { alert("Esta conta é usada em transações recorrentes. Remova ou edite essas recorrências primeiro."); return; }
     if (loans.some(l => l.linkedAccountId === accountId || l.repaymentIds.some(rpId => loanRepayments.find(rp => rp.id === rpId)?.creditedAccountId === accountId))) { alert("Esta conta está vinculada a empréstimos (financiamento ou recebimento de pagamentos). Verifique os empréstimos."); return; }
    if (window.confirm('Excluir esta conta?')) {setAccounts(prev => prev.filter(acc => acc.id !== accountId)); triggerAutoBackupIfEnabled();}
  };

  const handleAddCategory = (category: Category) => { if (activeProfileId) setCategories(prev => [...prev, category]); triggerAutoBackupIfEnabled();};
  const handleUpdateCategory = (updatedCategory: Category) => { if (activeProfileId) setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)); triggerAutoBackupIfEnabled();};
  const handleDeleteCategory = (categoryId: string) => {
    if (!activeProfileId) return;
    if (transactions.some(t => t.categoryId === categoryId)) { alert("Não é possível excluir categorias em uso. Remova ou reatribua as transações primeiro."); return; }
    if (recurringTransactions.some(rt => rt.categoryId === categoryId)) { alert("Esta categoria é usada em transações recorrentes. Remova ou edite essas recorrências primeiro."); return; }
    if (window.confirm('Excluir esta categoria?')) {setCategories(prev => prev.filter(cat => cat.id !== categoryId)); triggerAutoBackupIfEnabled();}
  };

  const handleAddCreditCard = (card: CreditCard) => { if (activeProfileId) setCreditCards(prev => [...prev, card]); triggerAutoBackupIfEnabled();};
  const handleUpdateCreditCard = (updatedCard: CreditCard) => { if (activeProfileId) setCreditCards(prev => prev.map(cc => cc.id === updatedCard.id ? updatedCard : cc)); triggerAutoBackupIfEnabled();};
  const handleDeleteCreditCard = (cardId: string) => {
    if (!activeProfileId) return;
    if (installmentPurchases.some(p => p.creditCardId === cardId)) { alert("Exclua primeiro todas as compras parceladas associadas a este cartão."); return; }
    if (loans.some(l => l.linkedCreditCardId === cardId)) { alert("Este cartão está vinculado ao financiamento de um empréstimo. Verifique os empréstimos."); return; }
    if (window.confirm('Excluir este cartão?')) {setCreditCards(prev => prev.filter(cc => cc.id !== cardId)); triggerAutoBackupIfEnabled();}
  };
  const handleAddInstallmentPurchase = (purchase: InstallmentPurchase) => { if (activeProfileId) setInstallmentPurchases(prev => [...prev, purchase]); triggerAutoBackupIfEnabled();};
  const handleUpdateInstallmentPurchase = (updatedPurchase: InstallmentPurchase) => { if (activeProfileId) setInstallmentPurchases(prev => prev.map(ip => ip.id === updatedPurchase.id ? updatedPurchase : ip)); triggerAutoBackupIfEnabled();};
  const handleDeleteInstallmentPurchase = (purchaseId: string) => { 
    if (!activeProfileId) return;
    if (loans.some(l => l.linkedInstallmentPurchaseId === purchaseId)) { alert("Esta compra parcelada está vinculada a um empréstimo. Exclua ou edite o empréstimo primeiro."); return; }
    if (window.confirm('Excluir compra parcelada?')) {setInstallmentPurchases(prev => prev.filter(ip => ip.id !== purchaseId)); triggerAutoBackupIfEnabled();} 
  };
  const handleMarkInstallmentPaid = (purchaseId: string) => {
    if (!activeProfileId) return;
    setInstallmentPurchases(prev => prev.map(ip => (ip.id === purchaseId && ip.installmentsPaid < ip.numberOfInstallments) ? { ...ip, installmentsPaid: ip.installmentsPaid + 1 } : ip ));
    triggerAutoBackupIfEnabled();
  };

  const handleAddMoneyBox = (moneyBox: MoneyBox) => { if (activeProfileId) setMoneyBoxes(prev => [...prev, moneyBox]); triggerAutoBackupIfEnabled();};
  const handleUpdateMoneyBox = (updatedMoneyBox: MoneyBox) => { if (activeProfileId) setMoneyBoxes(prev => prev.map(mb => mb.id === updatedMoneyBox.id ? updatedMoneyBox : mb)); triggerAutoBackupIfEnabled();};
  const handleAddMoneyBoxTransaction = (mbt: MoneyBoxTransaction, createLinkedTransaction: boolean, linkedAccId?: string) => {
    if (!activeProfileId) return;
    let finalMbt = { ...mbt };
    if (createLinkedTransaction && linkedAccId) {
      const mainTxId = generateId();
      const mainTxType = mbt.type === MoneyBoxTransactionType.DEPOSIT ? TransactionType.EXPENSE : TransactionType.INCOME;
      const mainTxDescription = `${mbt.type === MoneyBoxTransactionType.DEPOSIT ? 'Depósito na Caixinha' : 'Saque da Caixinha'}: ${moneyBoxes.find(mb=>mb.id === mbt.moneyBoxId)?.name || 'N/A'}${mbt.description ? ` (${mbt.description})` : ''}`;
      const newMainTransaction: Transaction = { id: mainTxId, type: mainTxType, amount: mbt.amount, date: mbt.date, accountId: linkedAccId, description: mainTxDescription };
      setTransactions(prev => [...prev, newMainTransaction]);
      finalMbt = { ...finalMbt, linkedTransactionId: mainTxId, linkedAccountId: linkedAccId };
       handleGenerateCommentForTransaction(newMainTransaction); // AI comment will trigger its own backup
    }
    setMoneyBoxTransactions(prev => [...prev, finalMbt]);
    if (!createLinkedTransaction) triggerAutoBackupIfEnabled(); // Only trigger if no main transaction was created (which would trigger its own)
  };
  const handleDeleteMoneyBoxTransaction = (mbtId: string) => {
    if (!activeProfileId) return;
    setMoneyBoxTransactions(prev => prev.filter(t => t.id !== mbtId));
    triggerAutoBackupIfEnabled();
  };


  const handleAddTag = (tag: Tag) => { if (activeProfileId) setTags(prev => [...prev, tag]); triggerAutoBackupIfEnabled();};
  const handleUpdateTag = (updatedTag: Tag) => { if (activeProfileId) setTags(prev => prev.map(t => t.id === updatedTag.id ? updatedTag : t)); triggerAutoBackupIfEnabled();};
  const handleDeleteTag = (tagId: string) => {
    if (!activeProfileId) return;
    if (transactions.some(t => t.tagIds?.includes(tagId))) { alert("Não é possível excluir tags em uso. Remova-as das transações primeiro."); return; }
    if (window.confirm('Excluir esta tag?')) {setTags(prev => prev.filter(t => t.id !== tagId)); triggerAutoBackupIfEnabled();}
  };

  const handleAddFuturePurchase = (purchaseData: Omit<FuturePurchase, 'status' | 'aiAnalysis' | 'aiAnalyzedAt'>) => {
    if (!activeProfileId) return;
    const newPurchase: FuturePurchase = {
      ...purchaseData,
      status: 'PLANNED', 
    };
    setFuturePurchases(prev => [...prev, newPurchase]);
    triggerAutoBackupIfEnabled();
  };
  const handleUpdateFuturePurchase = (updatedPurchaseData: Omit<FuturePurchase, 'status' | 'aiAnalysis' | 'aiAnalyzedAt'>) => {
    if (!activeProfileId) return;
    setFuturePurchases(prev => prev.map(p => 
      p.id === updatedPurchaseData.id ? { ...p, ...updatedPurchaseData } : p
    ));
    triggerAutoBackupIfEnabled();
  };
  const handleDeleteFuturePurchase = (purchaseId: string) => {
    if (!activeProfileId) return;
    if (window.confirm('Tem certeza que deseja excluir esta compra futura?')) {
      setFuturePurchases(prev => prev.filter(p => p.id !== purchaseId));
      triggerAutoBackupIfEnabled();
    }
  };


  const handleAddRecurringTransaction = (rt: RecurringTransaction) => { if (activeProfileId) setRecurringTransactions(prev => [...prev, rt]); triggerAutoBackupIfEnabled();};
  const handleUpdateRecurringTransaction = (updatedRT: RecurringTransaction) => { if (activeProfileId) setRecurringTransactions(prev => prev.map(rt => rt.id === updatedRT.id ? updatedRT : rt)); triggerAutoBackupIfEnabled();};
  const handleDeleteRecurringTransaction = (rtId: string) => { if (activeProfileId && window.confirm('Excluir esta transação recorrente?')) {setRecurringTransactions(prev => prev.filter(rt => rt.id !== rtId)); triggerAutoBackupIfEnabled(); }};
  
  const calculateNextDueDate = (currentDueDateStr: string, frequency: RecurringTransactionFrequency, customInterval?: number): string => {
    const currentDueDate = new Date(currentDueDateStr + 'T00:00:00'); 
    let nextDue = new Date(currentDueDate);
    switch (frequency) {
        case 'daily': nextDue.setDate(currentDueDate.getDate() + 1); break;
        case 'weekly': nextDue.setDate(currentDueDate.getDate() + 7); break;
        case 'monthly': nextDue.setMonth(currentDueDate.getMonth() + 1); break;
        case 'yearly': nextDue.setFullYear(currentDueDate.getFullYear() + 1); break;
        case 'custom_days': nextDue.setDate(currentDueDate.getDate() + (customInterval || 1)); break;
    }
    return getISODateString(nextDue);
  };
  const handleProcessRecurringTransactions = async (): Promise<{ count: number; errors: string[] }> => {
    if (!activeProfileId) return { count: 0, errors: ["Nenhum perfil ativo."] };
    return new Promise(resolve => {
        const today = getISODateString();
        let postedCount = 0;
        const errors: string[] = [];
        const updatedRTs: RecurringTransaction[] = [];
        const newTransactionsToPost: Transaction[] = [];

        recurringTransactions.forEach(rt => {
            let currentRt = { ...rt };
            let shouldPost = !currentRt.isPaused && currentRt.nextDueDate <= today;
            
            if (shouldPost && currentRt.endDate && currentRt.nextDueDate > currentRt.endDate) shouldPost = false; 
            if (shouldPost && currentRt.remainingOccurrences !== undefined && currentRt.remainingOccurrences <= 0) shouldPost = false; 

            if (shouldPost) {
                const newTx: Transaction = {
                    id: generateId(), type: currentRt.type, amount: currentRt.amount, categoryId: currentRt.categoryId,
                    description: currentRt.description, date: currentRt.nextDueDate, accountId: currentRt.accountId,
                    toAccountId: currentRt.toAccountId,
                };
                newTransactionsToPost.push(newTx);
                postedCount++;
                currentRt.lastPostedDate = currentRt.nextDueDate;
                currentRt.nextDueDate = calculateNextDueDate(currentRt.nextDueDate, currentRt.frequency, currentRt.customIntervalDays);
                if (currentRt.remainingOccurrences !== undefined) currentRt.remainingOccurrences--;
            }
            updatedRTs.push(currentRt); 
        });

        if (newTransactionsToPost.length > 0) {
            setTransactions(prev => [...prev, ...newTransactionsToPost]);
            newTransactionsToPost.forEach(tx => handleGenerateCommentForTransaction(tx)); // AI comment will trigger its own backup
        }
        setRecurringTransactions(updatedRTs); 
        if (newTransactionsToPost.length === 0) triggerAutoBackupIfEnabled(); // Trigger if no AI comments were generated
        resolve({ count: postedCount, errors });
    });
  };

  const handleAddLoan = (loanData: Omit<Loan, 'repaymentIds'>, ccInstallmentsFromForm?: number) => {
    if (!activeProfileId) return;
    let newLoan: Loan = { ...loanData, repaymentIds: [] }; 
    let newLinkedTransaction: Transaction | null = null;
    let newInstallmentPurchase: InstallmentPurchase | null = null;

    if (loanData.fundingSource === 'account' && loanData.linkedAccountId && loanData.amountDeliveredFromAccount) {
      const expenseTxId = generateId();
      newLinkedTransaction = {
        id: expenseTxId, type: TransactionType.EXPENSE, amount: loanData.amountDeliveredFromAccount,
        date: loanData.loanDate, accountId: loanData.linkedAccountId,
        description: `Empréstimo para ${loanData.personName}${loanData.description ? `: ${loanData.description}` : ''}`,
      };
      newLoan.linkedExpenseTransactionId = expenseTxId;
    } else if (loanData.fundingSource === 'creditCard' && loanData.linkedCreditCardId && loanData.costOnCreditCard && ccInstallmentsFromForm) {
      const purchaseId = generateId();
      newInstallmentPurchase = {
        id: purchaseId, creditCardId: loanData.linkedCreditCardId,
        description: `Operação de crédito (Empréstimo para ${loanData.personName} - Líquido: ${formatCurrency(loanData.amountDeliveredFromCredit || 0)})${loanData.description ? `: ${loanData.description}` : ''}`,
        purchaseDate: loanData.loanDate, totalAmount: loanData.costOnCreditCard,
        numberOfInstallments: ccInstallmentsFromForm, installmentsPaid: 0,
      };
      newLoan.linkedInstallmentPurchaseId = purchaseId;
    }

    setLoans(prev => [...prev, newLoan]);
    if (newLinkedTransaction) {
        setTransactions(prev => [...prev, newLinkedTransaction]);
        handleGenerateCommentForTransaction(newLinkedTransaction); // AI comment triggers backup
    }
    if (newInstallmentPurchase) {
      setInstallmentPurchases(prev => [...prev, newInstallmentPurchase]);
      if (!newLinkedTransaction) triggerAutoBackupIfEnabled(); // Trigger if no AI comment from main tx
    }
    if (!newLinkedTransaction && !newInstallmentPurchase) triggerAutoBackupIfEnabled();
  };

  const handleUpdateLoan = (updatedLoanData: Omit<Loan, 'repaymentIds'>) => {
    if (!activeProfileId) return;
    setLoans(prev => prev.map(l => l.id === updatedLoanData.id ? { ...l, ...updatedLoanData } : l));
    triggerAutoBackupIfEnabled();
  };

  const handleDeleteLoan = (loanId: string) => {
    if (!activeProfileId) return;
    const loanToDelete = loans.find(l => l.id === loanId);
    if (!loanToDelete) return;
    if (window.confirm(`Tem certeza que deseja excluir o empréstimo para ${loanToDelete.personName}? ...`)) {
      setLoanRepayments(prevRps => prevRps.filter(rp => !loanToDelete.repaymentIds.includes(rp.id)));
      setLoans(prevLoans => prevLoans.filter(l => l.id !== loanId));
      triggerAutoBackupIfEnabled();
    }
  };

  const handleAddLoanRepayment = (repaymentData: Omit<LoanRepayment, 'id' | 'loanId' | 'linkedIncomeTransactionId'>, loanId: string) => {
    if (!activeProfileId) return;
    const incomeTxId = generateId();
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    const newIncomeTransaction: Transaction = {
      id: incomeTxId, type: TransactionType.INCOME, amount: repaymentData.amountPaid,
      date: repaymentData.repaymentDate, accountId: repaymentData.creditedAccountId,
      description: `Recebimento empréstimo de ${loan.personName}${repaymentData.notes ? `: ${repaymentData.notes}` : ''}`,
    };
    const newRepayment: LoanRepayment = {
      ...repaymentData, id: generateId(), loanId: loanId, linkedIncomeTransactionId: incomeTxId,
    };
    setTransactions(prev => [...prev, newIncomeTransaction]);
    setLoanRepayments(prev => [...prev, newRepayment]);
    setLoans(prevLoans => prevLoans.map(l => 
      l.id === loanId ? { ...l, repaymentIds: [...l.repaymentIds, newRepayment.id] } : l
    ));
    handleGenerateCommentForTransaction(newIncomeTransaction); // AI comment triggers backup
  };

  const enrichedHandleImportData = (data: any) => {
    if (!activeProfileId) {
        alert("Nenhum perfil ativo. Selecione ou crie um perfil antes de importar dados.");
        return;
    }
    setTransactions(data.transactions || []);
    setAccounts(data.accounts || getInitialAccounts()); 
    setCategories(data.categories || getInitialCategories()); 
    setCreditCards(data.creditCards || []);
    setInstallmentPurchases(data.installmentPurchases || []);
    setMoneyBoxes(data.moneyBoxes || []);
    setMoneyBoxTransactions(data.moneyBoxTransactions || []);
    setFuturePurchases(data.futurePurchases || []); 
    setTags(data.tags || []); 
    setRecurringTransactions(data.recurringTransactions || []); 
    setLoans(data.loans || []); 
    setLoanRepayments(data.loanRepayments || []); 
    setAiConfig(prev => ({ 
        ...prev, 
        isEnabled: data.aiConfig?.isEnabled || false,
        monthlyIncome: data.aiConfig?.monthlyIncome || null, 
        autoBackupToFileEnabled: data.aiConfig?.autoBackupToFileEnabled || false,
    }));
    setAiInsights(data.aiInsights || []);
    setTheme(data.theme || 'system'); 
    setActiveView('DASHBOARD'); 
    setIsProfileSelectionOpen(false); 
  };
  

  const navItems = [
    { view: 'DASHBOARD' as AppView, label: 'Painel', icon: <ChartPieIcon /> },
    { view: 'TRANSACTIONS' as AppView, label: 'Transações', icon: <ListBulletIcon /> },
    { view: 'RECURRING_TRANSACTIONS' as AppView, label: 'Recorrências', icon: <ArrowPathIcon /> }, 
    { view: 'ACCOUNTS' as AppView, label: 'Contas', icon: <CreditCardIcon /> }, 
    { view: 'CREDIT_CARDS' as AppView, label: 'Cartões', icon: <CreditCardIcon /> },
    { view: 'MONEY_BOXES' as AppView, label: 'Caixinhas', icon: <PiggyBankIcon /> },
    { view: 'FUTURE_PURCHASES' as AppView, label: 'Compras Futuras', icon: <ShoppingCartIcon /> }, 
    { view: 'LOANS' as AppView, label: 'Empréstimos', icon: <UsersIcon /> }, 
    { view: 'CATEGORIES' as AppView, label: 'Categorias', icon: <TagIcon /> }, 
    { view: 'TAGS' as AppView, label: 'Tags', icon: <BookmarkSquareIcon /> }, 
    { view: 'AI_COACH' as AppView, label: 'AI Coach', icon: <ChatBubbleLeftRightIcon /> },
    { view: 'DATA_MANAGEMENT' as AppView, label: 'Backup', icon: <CogIcon /> },
  ];

  if (isProfileSelectionOpen || !activeProfileId) {
    return (
      <ProfileSelectionView
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleCreateProfile}
      />
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'DASHBOARD':
        return <DashboardView transactions={transactions} accounts={accounts} categories={categories} creditCards={creditCards} installmentPurchases={installmentPurchases} moneyBoxes={moneyBoxes} loans={loans} loanRepayments={loanRepayments} onAddTransaction={openTransactionModalForNew} calculateAccountBalance={calculateAccountBalance} calculateMoneyBoxBalance={calculateMoneyBoxBalance} />;
      case 'TRANSACTIONS':
        return <TransactionsView transactions={transactions} accounts={accounts} categories={categories} tags={tags} onAddTransaction={openTransactionModalForNew} onEditTransaction={openTransactionModalForEdit} onDeleteTransaction={handleDeleteTransaction} />;
      case 'ACCOUNTS':
        return <AccountsView accounts={accounts} transactions={transactions} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount} calculateAccountBalance={calculateAccountBalance} />;
      case 'CREDIT_CARDS':
        return <CreditCardsView creditCards={creditCards} installmentPurchases={installmentPurchases} onAddCreditCard={handleAddCreditCard} onUpdateCreditCard={handleUpdateCreditCard} onDeleteCreditCard={handleDeleteCreditCard} onAddInstallmentPurchase={handleAddInstallmentPurchase} onUpdateInstallmentPurchase={handleUpdateInstallmentPurchase} onDeleteInstallmentPurchase={handleDeleteInstallmentPurchase} onMarkInstallmentPaid={handleMarkInstallmentPaid} />;
      case 'CATEGORIES':
        return <CategoriesView categories={categories} transactions={transactions} aiConfig={aiConfig} onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onSuggestBudget={handleSuggestCategoryBudget} />;
      case 'MONEY_BOXES':
        return <MoneyBoxesView moneyBoxes={moneyBoxes} moneyBoxTransactions={moneyBoxTransactions} accounts={accounts} onAddMoneyBox={handleAddMoneyBox} onUpdateMoneyBox={handleUpdateMoneyBox} onAddMoneyBoxTransaction={handleAddMoneyBoxTransaction} onDeleteMoneyBoxTransaction={handleDeleteMoneyBoxTransaction} calculateMoneyBoxBalance={calculateMoneyBoxBalance} />;
      case 'FUTURE_PURCHASES': 
        return <FuturePurchasesView futurePurchases={futurePurchases} onAddFuturePurchase={handleAddFuturePurchase} onUpdateFuturePurchase={handleUpdateFuturePurchase} onDeleteFuturePurchase={handleDeleteFuturePurchase} onAnalyzeFuturePurchase={handleAnalyzeFuturePurchase} />;
      case 'TAGS': 
        return <TagsView tags={tags} transactions={transactions} onAddTag={handleAddTag} onUpdateTag={handleUpdateTag} onDeleteTag={handleDeleteTag} />;
      case 'RECURRING_TRANSACTIONS': 
        return <RecurringTransactionsView recurringTransactions={recurringTransactions} accounts={accounts} categories={categories} onAddRecurringTransaction={handleAddRecurringTransaction} onUpdateRecurringTransaction={handleUpdateRecurringTransaction} onDeleteRecurringTransaction={handleDeleteRecurringTransaction} onProcessRecurringTransactions={handleProcessRecurringTransactions} />;
      case 'LOANS': 
        return <LoansView loans={loans} loanRepayments={loanRepayments} accounts={accounts} creditCards={creditCards} onAddLoan={handleAddLoan} onUpdateLoan={handleUpdateLoan} onDeleteLoan={handleDeleteLoan} onAddLoanRepayment={handleAddLoanRepayment} />;
      case 'AI_COACH':
        return <AICoachView aiConfig={aiConfig} setAiConfig={setAiConfig} insights={aiInsights} onFetchGeneralAdvice={handleFetchGeneralAIAdvice} />;
      case 'DATA_MANAGEMENT':
        return <DataManagementView 
                  transactions={transactions} accounts={accounts} categories={categories} 
                  creditCards={creditCards} installmentPurchases={installmentPurchases} 
                  moneyBoxes={moneyBoxes} moneyBoxTransactions={moneyBoxTransactions}
                  futurePurchases={futurePurchases} 
                  tags={tags} recurringTransactions={recurringTransactions} 
                  loans={loans} loanRepayments={loanRepayments} 
                  onImportData={enrichedHandleImportData} 
                  aiConfigToExport={{isEnabled: aiConfig.isEnabled, monthlyIncome: aiConfig.monthlyIncome, autoBackupToFileEnabled: aiConfig.autoBackupToFileEnabled}}
                  aiInsightsToExport={aiInsights}
                  activeProfileName={activeProfileName} 
                  themeToExport={theme} 
                  setAiConfig={setAiConfig} // Pass setAiConfig
                />;
      case 'PROFILE_SELECTION': 
        return <ProfileSelectionView profiles={profiles} onSelectProfile={handleSelectProfile} onCreateProfile={handleCreateProfile} />;
      default:
        return <DashboardView transactions={transactions} accounts={accounts} categories={categories} creditCards={creditCards} installmentPurchases={installmentPurchases} moneyBoxes={moneyBoxes} loans={loans} loanRepayments={loanRepayments} onAddTransaction={openTransactionModalForNew} calculateAccountBalance={calculateAccountBalance} calculateMoneyBoxBalance={calculateMoneyBoxBalance} />;
    }
  };
  
  const mobileNavItems = navItems.filter(item => 
    ['DASHBOARD', 'TRANSACTIONS', 'AI_COACH', 'FUTURE_PURCHASES', 'ACCOUNTS'].includes(item.view) 
  ).slice(0,5);


  return (
    <div className="min-h-screen bg-background text-textBase dark:bg-backgroundDark dark:text-textBaseDark flex flex-col md:flex-row transition-colors duration-300">
      <nav className="hidden md:flex flex-col w-64 bg-surface dark:bg-surfaceDark border-r border-borderBase dark:border-borderBaseDark p-4 fixed top-0 left-0 h-full shadow-lg dark:shadow-neutralDark/40 overflow-y-auto">
        <div className="px-2 py-3 mb-1">
          <h1 className="text-2xl font-bold text-primary dark:text-primaryDark">{APP_NAME}</h1>
          <div className="flex items-center mt-1 text-xs text-textMuted dark:text-textMutedDark">
            <UserCircleIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate" title={activeProfileName}>{activeProfileName}</span>
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
                    onClick={() => setActiveView(item.view)}
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
                onClick={handleSwitchProfileRequest}
                className="w-full flex items-center justify-start px-3 py-2.5 rounded-lg text-sm font-medium text-textMuted dark:text-textMutedDark hover:bg-neutral/5 dark:hover:bg-neutralDark/10 hover:text-textBase dark:hover:text-textBaseDark"
                title="Mudar Perfil"
            >
                <UserCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" /> 
                <span className="flex-1 truncate">Mudar Perfil</span> 
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
            return (
              <div 
                key={item.view} 
                className="flex flex-col items-center justify-center p-1.5 rounded-md opacity-50"
                aria-label={`${item.label} (Indisponível)`} 
              >
                {React.cloneElement(item.icon, { className: "w-5 h-5 mb-0.5 text-textMuted/50 dark:text-textMutedDark/50" })}
                <span className="text-[10px] leading-tight text-center text-textMuted/50 dark:text-textMutedDark/50">{item.label}</span>
              </div>
            );
          }
          return (
            <Button
              key={item.view}
              variant="ghost"
              onClick={() => setActiveView(item.view)}
              title={item.label}
              className={`flex flex-col items-center justify-center p-1.5 rounded-md relative 
                          ${activeView === item.view 
                            ? '!text-primary dark:!text-primaryDark !bg-primary/10 dark:!bg-primaryDark/20' 
                            : '!text-textMuted dark:!text-textMutedDark hover:!text-primary dark:hover:!text-primaryDark'
                          }`}
              aria-current={activeView === item.view ? 'page' : undefined}
            >
              {React.cloneElement(item.icon, { className: "w-5 h-5 mb-0.5" })}
              <span className="text-[10px] leading-tight text-center">{item.label}</span>
              {item.view === 'AI_COACH' && aiConfig.isEnabled && aiConfig.apiKeyStatus === 'available' && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              )}
            </Button>
          );
        })}
      </nav>
        
      <Button
        onClick={openTransactionModalForNew}
        title="Nova Transação"
        variant="primary"
        className="md:hidden fixed bottom-16 right-4 text-white rounded-full p-3 shadow-lg z-30 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        aria-label="Adicionar Nova Transação"
      >
        <PlusIcon className="w-7 h-7" />
      </Button>
      
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
          categories={categories}
          tags={tags} 
          initialTransaction={editingTransaction}
        />
      </Modal>
    </div>
  );
};

declare module './components/DataManagementView' {
    interface DataManagementViewProps {
        futurePurchases?: FuturePurchase[]; 
        aiConfigToExport?: { isEnabled: boolean, monthlyIncome?: number | null, autoBackupToFileEnabled?: boolean };
        aiInsightsToExport?: AIInsight[];
        activeProfileName?: string; 
        themeToExport?: Theme; 
        setAiConfig?: React.Dispatch<React.SetStateAction<AIConfig>>; // Added for auto backup toggle
    }
}

declare module './App' { 
    interface DataManagementViewProps { 
         onImportData: (data: { 
            transactions: Transaction[]; 
            accounts: Account[]; 
            categories: Category[];
            creditCards: CreditCard[];
            installmentPurchases: InstallmentPurchase[];
            moneyBoxes: MoneyBox[];
            moneyBoxTransactions: MoneyBoxTransaction[];
            futurePurchases?: FuturePurchase[]; 
            tags: Tag[]; 
            recurringTransactions: RecurringTransaction[];
            loans: Loan[]; 
            loanRepayments: LoanRepayment[]; 
            aiConfig?: { isEnabled: boolean; monthlyIncome?: number | null; autoBackupToFileEnabled?: boolean; }; 
            aiInsights?: AIInsight[];
            theme?: Theme; 
        }) => void;
        setAiConfig?: React.Dispatch<React.SetStateAction<AIConfig>>; // Make sure it's here too
    }
}


export default App;