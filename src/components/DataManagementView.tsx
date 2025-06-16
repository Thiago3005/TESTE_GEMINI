
import React from 'react';
import { useState } from 'react';
import { 
    Transaction, Account, Category, CreditCard, InstallmentPurchase, 
    MoneyBox, MoneyBoxTransaction, Tag, RecurringTransaction, Loan, LoanRepayment,
    FuturePurchase, 
    AIConfig, AIInsight, Theme 
} from '../types';
import Button from './Button';

interface DataManagementViewProps {
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
  aiConfigToExport?: { isEnabled: boolean; monthlyIncome?: number | null; autoBackupToFileEnabled?: boolean; }; 
  aiInsightsToExport?: AIInsight[];
  activeProfileName?: string; 
  themeToExport?: Theme; 
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
  setAiConfig?: React.Dispatch<React.SetStateAction<AIConfig>>; // For auto backup toggle
}

const DataManagementView: React.FC<DataManagementViewProps> = ({
  transactions,
  accounts,
  categories,
  creditCards,
  installmentPurchases,
  moneyBoxes,
  moneyBoxTransactions,
  futurePurchases, 
  tags, 
  recurringTransactions, 
  loans, 
  loanRepayments, 
  aiConfigToExport, 
  aiInsightsToExport, 
  activeProfileName, 
  themeToExport, 
  onImportData,
  setAiConfig, // New prop
}) => {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleExportData = () => {
    const profileIdentifier = activeProfileName ? activeProfileName.replace(/\s+/g, '_') : 'perfil_desconhecido';
    const dataToExport = {
      profileName: activeProfileName || 'N/A', 
      exportedAt: new Date().toISOString(),
      transactions,
      accounts,
      categories, 
      creditCards,
      installmentPurchases,
      moneyBoxes,
      moneyBoxTransactions,
      futurePurchases, 
      tags, 
      recurringTransactions, 
      loans, 
      loanRepayments, 
      aiConfig: aiConfigToExport, 
      aiInsights: aiInsightsToExport, 
      theme: themeToExport, 
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

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedData = JSON.parse(text);
        
        // Basic validation (can be expanded)
        if (!importedData || !Array.isArray(importedData.transactions) || !Array.isArray(importedData.accounts) || !Array.isArray(importedData.categories)) {
          throw new Error('Formato de arquivo inválido. Estruturas de dados principais ausentes ou inválidas.');
        }
        if (importedData.futurePurchases && !Array.isArray(importedData.futurePurchases)) {
            throw new Error('Formato de arquivo inválido: futurePurchases deve ser um array.');
        }
        if (importedData.aiConfig && typeof importedData.aiConfig.isEnabled !== 'boolean') {
            throw new Error('Formato de arquivo inválido: aiConfig.isEnabled deve ser um booleano.');
        }
        if (importedData.aiConfig && typeof importedData.aiConfig.autoBackupToFileEnabled !== 'boolean' && importedData.aiConfig.autoBackupToFileEnabled !== undefined) {
             throw new Error('Formato de arquivo inválido: aiConfig.autoBackupToFileEnabled deve ser um booleano ou indefinido.');
        }


        if (window.confirm(`Tem certeza que deseja importar estes dados para o perfil "${activeProfileName || 'Atual'}"? Todos os dados ATUAIS deste perfil serão substituídos.`)) {
          onImportData({
            transactions: importedData.transactions || [],
            accounts: importedData.accounts || [],
            categories: importedData.categories || [],
            creditCards: importedData.creditCards || [],
            installmentPurchases: importedData.installmentPurchases || [],
            moneyBoxes: importedData.moneyBoxes || [],
            moneyBoxTransactions: importedData.moneyBoxTransactions || [],
            futurePurchases: importedData.futurePurchases || [], 
            tags: importedData.tags || [], 
            recurringTransactions: importedData.recurringTransactions || [], 
            loans: importedData.loans || [], 
            loanRepayments: importedData.loanRepayments || [], 
            aiConfig: importedData.aiConfig 
              ? { 
                  isEnabled: importedData.aiConfig.isEnabled, 
                  monthlyIncome: importedData.aiConfig.monthlyIncome !== undefined ? importedData.aiConfig.monthlyIncome : null,
                  autoBackupToFileEnabled: importedData.aiConfig.autoBackupToFileEnabled || false,
                } 
              : { isEnabled: false, monthlyIncome: null, autoBackupToFileEnabled: false }, 
            aiInsights: importedData.aiInsights || [], 
            theme: importedData.theme || 'system', 
          });
          setImportSuccess(`Dados importados com sucesso para o perfil "${importedData.profileName || activeProfileName || 'Atual'}"!`);
        }
        event.target.value = ''; 
      } catch (error: any) {
        console.error('Erro ao importar dados:', error);
        setImportError(`Erro ao importar: ${error.message}`);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleToggleAutoBackup = () => {
    if (setAiConfig) {
      setAiConfig(prev => ({ ...prev, autoBackupToFileEnabled: !prev.autoBackupToFileEnabled }));
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Gerenciamento de Dados do Perfil: <span className="text-primary dark:text-primaryDark">{activeProfileName}</span></h1>
      
      <div className="bg-surface dark:bg-surfaceDark p-6 rounded-lg shadow dark:shadow-neutralDark/30">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Exportar Dados</h2>
        <p className="text-textMuted dark:text-textMutedDark mb-4">
          Faça um backup dos dados do perfil atual ({activeProfileName}) em um arquivo JSON.
        </p>
        <Button onClick={handleExportData} variant="secondary">
          Exportar Dados (.json)
        </Button>
      </div>

      <div className="bg-surface dark:bg-surfaceDark p-6 rounded-lg shadow dark:shadow-neutralDark/30">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Importar Dados</h2>
        <p className="text-textMuted dark:text-textMutedDark mb-4">
          Importe dados de um arquivo JSON para o perfil atual ({activeProfileName}). <strong className="text-destructive dark:text-destructiveDark">Atenção:</strong> Isso substituirá todos os dados atuais deste perfil.
        </p>
        <input
          type="file"
          accept=".json"
          onChange={handleImportData}
          className="block w-full text-sm text-textMuted dark:text-textMutedDark file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary dark:file:bg-primaryDark/20 dark:file:text-primaryDark hover:file:bg-primary/20 dark:hover:file:bg-primaryDark/30"
        />
        {importError && <p className="mt-2 text-sm text-destructive dark:text-destructiveDark/90">{importError}</p>}
        {importSuccess && <p className="mt-2 text-sm text-secondary dark:text-secondaryDark">{importSuccess}</p>}
      </div>

      {setAiConfig && aiConfigToExport && (
         <div className="bg-surface dark:bg-surfaceDark p-6 rounded-lg shadow dark:shadow-neutralDark/30">
            <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Configurações de Backup</h2>
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-medium text-textBase dark:text-textBaseDark">Backup Automático para Arquivo</p>
                    <p className="text-xs text-textMuted dark:text-textMutedDark">
                        {aiConfigToExport.autoBackupToFileEnabled 
                            ? "Ativado: Um arquivo .json será baixado após alterações importantes."
                            : "Desativado: Exporte manualmente quando desejar."
                        }
                    </p>
                    {aiConfigToExport.autoBackupToFileEnabled && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                            Atenção: Downloads frequentes podem ser interrompidos pelo navegador.
                        </p>
                    )}
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${aiConfigToExport.autoBackupToFileEnabled ? 'bg-primary dark:bg-primaryDark' : 'bg-neutral/30 dark:bg-neutralDark/40'}`}>
                        <span
                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${aiConfigToExport.autoBackupToFileEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                        <input
                        type="checkbox"
                        className="absolute opacity-0 w-0 h-0"
                        checked={aiConfigToExport.autoBackupToFileEnabled}
                        onChange={handleToggleAutoBackup}
                        />
                    </div>
                </label>
            </div>
         </div>
      )}

    </div>
  );
};

export default DataManagementView;
