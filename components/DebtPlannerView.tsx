


import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Debt, DebtPayment, Account, DebtStrategy, DebtProjection, AIInsight, DebtRateAnalysis, DebtViabilityAnalysis, AIConfig } from '../types';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import BanknotesIcon from './icons/BanknotesIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import { formatCurrency, formatDate } from '../utils/helpers';
import DebtFormModal from './DebtFormModal';
import DebtPaymentFormModal from './DebtPaymentFormModal';
import { calculateDebtPayoff } from '../utils/debtCalculator';
import Select from './Select';
import Input from './Input';
import Modal from './Modal';
import { LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, CartesianGrid, Legend } from 'recharts';


interface DebtPlannerViewProps {
  debts: Debt[];
  debtPayments: DebtPayment[];
  accounts: Account[];
  onAddDebt: (debtData: Omit<Debt, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived' | 'linked_income_transaction_id'>, createIncome: boolean, creditedAccountId?: string, rateAnalysis?: DebtRateAnalysis | null, viabilityAnalysis?: DebtViabilityAnalysis | null) => void;
  onUpdateDebt: (debtData: Debt, rateAnalysis?: DebtRateAnalysis | null, viabilityAnalysis?: DebtViabilityAnalysis | null) => void;
  onDeleteDebt: (debtId: string) => void;
  onAddDebtPayment: (paymentData: Omit<DebtPayment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id'>, createLinkedExpense: boolean, linkedAccountId?: string) => void;
  onFetchDebtStrategyExplanation: (strategy: DebtStrategy) => Promise<void>;
  onFetchDebtProjectionSummary: (projection: DebtProjection, debts: Debt[], strategy: DebtStrategy) => Promise<void>;
  isPrivacyModeEnabled?: boolean;
  onAnalyzeRate: (debt: Partial<Debt>) => Promise<DebtRateAnalysis | null>;
  onAnalyzeViability: (debt: Partial<Debt>) => Promise<DebtViabilityAnalysis | null>;
  isAIFeatureEnabled: boolean;
  aiConfig: AIConfig;
}

const DebtItem: React.FC<{debt: Debt, onRegisterPayment: (debt: Debt) => void, onEdit: (debt:Debt)=>void, onDelete: (debtId: string) => void, hasPayments: boolean, isPrivacyModeEnabled?: boolean}> =
  ({ debt, onRegisterPayment, onEdit, onDelete, hasPayments, isPrivacyModeEnabled }) => {

  const progressPercent = debt.initial_balance > 0
    ? Math.max(0, Math.min(((debt.initial_balance - debt.current_balance) / debt.initial_balance) * 100, 100))
    : 0;

  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">{debt.name}</h3>
          <p className="text-xs text-textMuted dark:text-textMutedDark">{debt.type === 'credit_card_balance' ? 'Saldo de Cartão' : debt.type === 'personal_loan' ? 'Empréstimo Pessoal' : 'Outra Dívida'}</p>
        </div>
        <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(debt)} aria-label="Editar Dívida" className="!p-1.5">
                <EditIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(debt.id)}
              aria-label="Excluir Dívida"
              className="!p-1.5"
              disabled={hasPayments}
              title={hasPayments ? "Exclua os pagamentos desta dívida primeiro" : "Excluir Dívida"}
            >
                <TrashIcon className={`w-4 h-4 ${hasPayments ? 'text-neutralDark/50' : 'text-destructive dark:text-destructiveDark'}`} />
            </Button>
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-destructive dark:text-destructiveDark">
          Saldo Devedor: {formatCurrency(debt.current_balance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
        </p>
        <p className="text-sm text-textMuted dark:text-textMutedDark">
          Taxa de Juros: {debt.interest_rate_annual}% a.a. | Mínimo: {formatCurrency(debt.minimum_payment, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
        </p>
        {debt.due_date_day_of_month && <p className="text-xs text-textMuted dark:text-textMutedDark">Vencimento usual: Dia {debt.due_date_day_of_month}</p>}
      </div>
      {debt.initial_balance > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Progresso</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full progress-bar-bg rounded-full h-2 dark:progress-bar-bg">
            <div
              className="h-2 rounded-full bg-secondary dark:bg-secondaryDark"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}
      {debt.current_balance > 0 && (
        <Button variant="secondary" size="sm" onClick={() => onRegisterPayment(debt)}>
          <PlusIcon className="w-4 h-4 mr-1" /> Registrar Pagamento
        </Button>
      )}
       {debt.current_balance <= 0 && (
        <p className="text-sm font-semibold text-secondary dark:text-secondaryDark">Dívida Quitada!</p>
      )}
    </li>
  );
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, isPrivacyModeEnabled }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface dark:bg-surfaceDark p-2 border border-borderBase dark:border-borderBaseDark rounded shadow-lg">
        <p className="text-sm font-semibold text-textBase dark:text-textBaseDark">Mês: {label}</p>
        <p className="text-sm text-destructive dark:text-destructiveDark">{payload[0].name}: {formatCurrency(payload[0].value, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
      </div>
    );
  }
  return null;
};


const DebtPlannerView: React.FC<DebtPlannerViewProps> = ({
  debts,
  debtPayments,
  accounts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onAddDebtPayment,
  onFetchDebtStrategyExplanation,
  onFetchDebtProjectionSummary,
  isPrivacyModeEnabled,
  onAnalyzeRate,
  onAnalyzeViability,
  isAIFeatureEnabled,
  aiConfig,
}) => {
  const [isDebtFormModalOpen, setIsDebtFormModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const [isPaymentFormModalOpen, setIsPaymentFormModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);

  const [extraPayment, setExtraPayment] = useState('0');
  const [selectedStrategy, setSelectedStrategy] = useState<DebtStrategy>('snowball');
  const [projection, setProjection] = useState<DebtProjection | null>(null);
  const [isLoadingProjection, setIsLoadingProjection] = useState(false);
  
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);


  const openDebtFormModalForNew = () => {
    setEditingDebt(null);
    setIsDebtFormModalOpen(true);
  };

  const openDebtFormModalForEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setIsDebtFormModalOpen(true);
  };

  const openPaymentFormModal = (debt: Debt) => {
    setSelectedDebtForPayment(debt);
    setIsPaymentFormModalOpen(true);
  };

  const totalCurrentDebt = useMemo(() => {
    return debts.filter(d => !d.is_archived).reduce((sum, debt) => sum + debt.current_balance, 0);
  }, [debts]);

  const totalMinimumPayments = useMemo(() => {
     return debts.filter(d => !d.is_archived && d.current_balance > 0).reduce((sum, debt) => sum + debt.minimum_payment, 0);
  }, [debts]);

  const hasPaymentsForDebt = (debtId: string): boolean => {
    return debtPayments.some(dp => dp.debt_id === debtId);
  }
  
  const financialHealthScore = useMemo(() => {
    if (!aiConfig.monthlyIncome || aiConfig.monthlyIncome <= 0 || totalMinimumPayments <= 0) {
        return { score: -1, label: 'Indisponível', advice: 'Informe sua renda mensal no AI Coach e pagamentos mínimos das dívidas para calcular.', color: 'text-neutral' };
    }
    const dti = (totalMinimumPayments / aiConfig.monthlyIncome) * 100;

    if (dti <= 15) return { score: 90, label: 'Excelente', advice: 'Seu nível de endividamento é baixo e saudável.', color: 'text-green-500 dark:text-green-400', bgColor: 'bg-green-500' };
    if (dti <= 28) return { score: 70, label: 'Bom', advice: 'Seu endividamento está em um nível gerenciável. Continue assim!', color: 'text-emerald-500 dark:text-emerald-400', bgColor: 'bg-emerald-500' };
    if (dti <= 36) return { score: 50, label: 'Alerta', advice: 'Seu nível de endividamento requer atenção. Evite novas dívidas.', color: 'text-yellow-500 dark:text-yellow-400', bgColor: 'bg-yellow-500' };
    if (dti <= 43) return { score: 30, label: 'Crítico', advice: 'Nível de endividamento alto. Priorize a quitação urgentemente.', color: 'text-amber-500 dark:text-amber-400', bgColor: 'bg-amber-500' };
    return { score: 10, label: 'Muito Crítico', advice: 'Nível de endividamento perigoso. Busque ajuda e renegocie suas dívidas.', color: 'text-red-500 dark:text-red-400', bgColor: 'bg-red-500' };
  }, [aiConfig.monthlyIncome, totalMinimumPayments]);

  const handleCalculateProjection = () => {
    setIsLoadingProjection(true);
    setProjection(null);
    const activeDebts = debts.filter(d => !d.is_archived && d.current_balance > 0);
    if (activeDebts.length === 0) {
      setIsLoadingProjection(false);
      return;
    }
    const result = calculateDebtPayoff(activeDebts, parseFloat(extraPayment) || 0, selectedStrategy);
    setProjection(result);
    setIsLoadingProjection(false);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
        handleCalculateProjection();
    }, 500); // Debounce calculation

    return () => {
        clearTimeout(handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPayment, selectedStrategy, debts]);
  
  const handleFetchExplanation = async (strategy: DebtStrategy) => {
    setIsExplanationModalOpen(true); 
    await onFetchDebtStrategyExplanation(strategy);
  };
  
  const handleFetchProjectionSummary = async () => {
    if (!projection) return;
    setIsSummaryModalOpen(true); 
    await onFetchDebtProjectionSummary(projection, debts.filter(d => !d.is_archived && d.current_balance > 0), selectedStrategy);
  };

  const handleSaveDebt = (
      debtData: Omit<Debt, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived' | 'linked_income_transaction_id'> & { id?: string },
      createIncome = false,
      creditedAccountId = '',
      rateAnalysis?: DebtRateAnalysis | null,
      viabilityAnalysis?: DebtViabilityAnalysis | null
  ) => {
      if (editingDebt && debtData.id) {
          onUpdateDebt({ ...editingDebt, ...debtData }, rateAnalysis, viabilityAnalysis);
      } else {
          const { id, ...newDebtData } = debtData;
          onAddDebt(newDebtData, createIncome, creditedAccountId, rateAnalysis, viabilityAnalysis);
      }
  };

  const strategyOptions: { value: DebtStrategy; label: string }[] = [
    { value: 'minimums', label: 'Apenas Pagamentos Mínimos' },
    { value: 'snowball', label: 'Bola de Neve (Menor Saldo Primeiro)' },
    { value: 'avalanche', label: 'Avalanche (Maior Juros Primeiro)' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <BanknotesIcon className="w-8 h-8 text-primary dark:text-primaryDark" />
          <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Planejador de Dívidas</h1>
        </div>
        <Button onClick={openDebtFormModalForNew} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Adicionar Dívida
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">TOTAL DE DÍVIDAS ATUAIS</h2>
          <p className="text-3xl font-bold text-destructive dark:text-destructiveDark">
            {formatCurrency(totalCurrentDebt, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
          <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">SOMA DOS PAGAMENTOS MÍNIMOS</h2>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-500">
            {formatCurrency(totalMinimumPayments, 'BRL', 'pt-BR', isPrivacyModeEnabled)} / mês
          </p>
        </div>
        <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30">
            <h2 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-2 uppercase">Saúde Financeira</h2>
            {financialHealthScore.score === -1 ? (
                <p className="text-textMuted dark:text-textMutedDark text-xs">{financialHealthScore.advice}</p>
            ) : (
                <div className="flex items-center gap-4">
                    <div className={`text-4xl font-bold ${financialHealthScore.color}`}>
                        {financialHealthScore.score}
                    </div>
                    <div className="flex-1">
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div className={`${financialHealthScore.bgColor} h-2 rounded-full`} style={{width: `${financialHealthScore.score}%`}}></div>
                        </div>
                        <p className={`mt-1 font-semibold text-md ${financialHealthScore.color}`}>{financialHealthScore.label}</p>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30 space-y-4">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark">Estratégia de Quitação Interativa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
                <Select
                    label="Estratégia de Pagamento"
                    id="debtStrategy"
                    options={strategyOptions}
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value as DebtStrategy)}
                />
                <Input
                    label="Pagamento Extra Mensal (R$)"
                    id="extraPayment"
                    type="number"
                    step="10"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value)}
                    placeholder="Ex: 100.00"
                />
                <Button variant="ghost" size="sm" onClick={() => handleFetchExplanation(selectedStrategy)}>
                    <LightBulbIcon className="w-4 h-4 mr-1.5" /> O que é a estratégia "{strategyOptions.find(o => o.value === selectedStrategy)?.label}"?
                </Button>
            </div>
            
            <div className="p-4 bg-background dark:bg-backgroundDark rounded-lg h-full">
                {isLoadingProjection && <p>Calculando...</p>}
                {!isLoadingProjection && projection && projection.monthsToPayoff > 0 && (
                    <div className="space-y-1 text-sm">
                        <h3 className="font-semibold text-md mb-2">Resultados da Projeção:</h3>
                        <p><strong>Tempo para Quitar:</strong> {(projection.monthsToPayoff / 12).toFixed(1)} anos ({projection.monthsToPayoff} meses)</p>
                        <p><strong>Total de Juros Pagos:</strong> {formatCurrency(projection.totalInterestPaid, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
                        <p><strong>Total Pago:</strong> {formatCurrency(projection.totalPaid, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
                        {isAIFeatureEnabled && (
                            <Button variant="secondary" size="sm" onClick={handleFetchProjectionSummary} className="!mt-3">
                                <LightBulbIcon className="w-4 h-4 mr-1.5" /> Obter Resumo da IA
                            </Button>
                        )}
                    </div>
                )}
                 {!isLoadingProjection && projection && projection.monthsToPayoff === -1 && (
                     <p className="text-destructive dark:text-destructiveDark">Com base nos pagamentos, esta dívida levará mais de 60 anos para ser quitada.</p>
                 )}
                 {!isLoadingProjection && !projection && debts.filter(d => !d.is_archived && d.current_balance > 0).length > 0 && (
                    <p className="text-textMuted dark:text-textMutedDark">Ajuste os valores para ver a projeção.</p>
                 )}
            </div>
        </div>
        {/* Chart */}
        {projection && projection.monthsToPayoff > 0 && !isPrivacyModeEnabled && (
            <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projection.monthlyTotalBalanceLog} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="month" name="Mês" tick={{fontSize:10}} />
                        <YAxis tickFormatter={(val) => formatCurrency(val, 'BRL', 'pt-BR', true)} tick={{fontSize:10}}/>
                        <Tooltip content={<CustomTooltip isPrivacyModeEnabled={isPrivacyModeEnabled} />} />
                        <Legend formatter={(value) => <span className="text-textMuted dark:text-textMutedDark text-sm">{value}</span>} />
                        <Line type="monotone" dataKey="totalBalance" name="Saldo Devedor Total" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark mb-3">Minhas Dívidas</h2>
        {debts.filter(d => !d.is_archived).length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.filter(d => !d.is_archived).map(debt => (
              <DebtItem
                key={debt.id}
                debt={debt}
                onRegisterPayment={openPaymentFormModal}
                onEdit={openDebtFormModalForEdit}
                onDelete={onDeleteDebt}
                hasPayments={hasPaymentsForDebt(debt.id)}
                isPrivacyModeEnabled={isPrivacyModeEnabled}
              />
            ))}
          </ul>
        ) : (
          <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma dívida registrada. Adicione uma para começar!</p>
        )}
      </div>

      <DebtFormModal
        isOpen={isDebtFormModalOpen}
        onClose={() => setIsDebtFormModalOpen(false)}
        onSave={handleSaveDebt}
        onAnalyzeRate={onAnalyzeRate}
        onAnalyzeViability={onAnalyzeViability}
        existingDebt={editingDebt}
        accounts={accounts}
        isAIFeatureEnabled={isAIFeatureEnabled}
      />

      {selectedDebtForPayment && (
        <DebtPaymentFormModal
          isOpen={isPaymentFormModalOpen}
          onClose={() => setIsPaymentFormModalOpen(false)}
          onSave={onAddDebtPayment}
          debt={selectedDebtForPayment}
          accounts={accounts}
        />
      )}

      {isExplanationModalOpen && (
          <Modal isOpen={isExplanationModalOpen} onClose={() => setIsExplanationModalOpen(false)} title="Explicação da Estratégia">
             {/* The content will be filled by AI insights in App.tsx state, this is just a placeholder view */}
             <p className="text-textMuted dark:text-textMutedDark">Carregando explicação da IA...</p>
          </Modal>
      )}
      {isSummaryModalOpen && (
          <Modal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} title="Resumo da Projeção (IA)">
             {/* The content will be filled by AI insights in App.tsx state */}
             <p className="text-textMuted dark:text-textMutedDark">Carregando resumo da IA...</p>
          </Modal>
      )}

    </div>
  );
};

export default DebtPlannerView;
