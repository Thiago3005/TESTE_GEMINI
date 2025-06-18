import React from 'react';
// useState removed as importError and importSuccess are no longer used.
import {
    Transaction, Account, Category, CreditCard, InstallmentPurchase,
    MoneyBox, MoneyBoxTransaction, Tag, RecurringTransaction, Loan, LoanRepayment,
    FuturePurchase, AIInsight, SupabaseUser, UserPreferences, AIConfig,
    Debt, DebtPayment
} from '../types';
import Button from './Button';
// supabase client import removed as it's not directly used here after removing import.

interface DataManagementViewProps {
  allData: {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    creditCards: CreditCard[];
    installmentPurchases: InstallmentPurchase[];
    moneyBoxes: MoneyBox[];
    moneyBoxTransactions: MoneyBoxTransaction[];
    futurePurchases: FuturePurchase[];
    tags: Tag[];
    recurringTransactions: RecurringTransaction[];
    loans: Loan[];
    loanRepayments: LoanRepayment[];
    aiInsights: AIInsight[];
    debts: Debt[]; // Added
    debtPayments: DebtPayment[]; // Added
  };
  userPreferencesToExport: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>;
  activeProfileName?: string;
  user: SupabaseUser | null;
  setAiConfig?: (configUpdater: Partial<Omit<AIConfig, 'apiKeyStatus'>>) => void;
}

const DataManagementView: React.FC<DataManagementViewProps> = ({
  allData,
  userPreferencesToExport,
  activeProfileName,
  user,
  // setAiConfig, // Destructure if used within this component
}) => {

  const handleExportData = async () => {
    if (!user) {
      alert("Nenhum usuário logado para exportar dados.");
      return;
    }
    const profileIdentifier = activeProfileName ? activeProfileName.replace(/\s+/g, '_') : 'usuario_desconhecido';

    const dataToExport = {
      profileName: activeProfileName || 'N/A',
      exportedAt: new Date().toISOString(),
      supabaseSchemaVersion: "2.0",
      
      userPreferences: userPreferencesToExport,
      ...allData,
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro_pessoal_${profileIdentifier}_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Gerenciamento de Dados: <span className="text-primary dark:text-primaryDark">{activeProfileName}</span></h1>
      
      <div className="bg-surface dark:bg-surfaceDark p-6 rounded-lg shadow dark:shadow-neutralDark/30">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Exportar Dados</h2>
        <p className="text-textMuted dark:text-textMutedDark mb-4">
          Faça um backup completo dos seus dados ({activeProfileName}) em um arquivo JSON.
        </p>
        <Button onClick={handleExportData} variant="secondary">
          Exportar Todos os Dados (.json)
        </Button>
      </div>

      <div className="bg-surface dark:bg-surfaceDark p-6 rounded-lg shadow dark:shadow-neutralDark/30">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Importar Dados</h2>
        <p className="text-textMuted dark:text-textMutedDark mb-4">
          A importação de dados a partir de um arquivo JSON não é suportada nesta versão do aplicativo.
          Para restaurar dados, considere utilizar ferramentas de gerenciamento de banco de dados diretamente com o Supabase, se aplicável.
        </p>
      </div>
      
       {userPreferencesToExport && (
         <div className="bg-surface dark:bg-surfaceDark p-6 rounded-lg shadow dark:shadow-neutralDark/30">
            <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Backup Automático em Arquivo (Local)</h2>
            <p className="text-textMuted dark:text-textMutedDark">
                {userPreferencesToExport.ai_auto_backup_enabled
                ? "Backup automático local em arquivo está ATIVADO."
                : "Backup automático local em arquivo está DESATIVADO."}
                <span className="block text-xs">Isso é um backup extra em arquivo JSON no seu dispositivo, independente da sincronização com o Supabase.</span>
            </p>
            {/* Toggle button could be re-added here if setAiConfig is passed to update userPreferences.ai_auto_backup_enabled */}
        </div>
      )}
    </div>
  );
};

export default DataManagementView;