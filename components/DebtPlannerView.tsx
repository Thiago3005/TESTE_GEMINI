
import React from 'react';
import { useState, useMemo } from 'react';
import { Debt, DebtPayment, Account, DebtStrategy, DebtProjection, AIInsight } from '../types';
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


interface DebtPlannerViewProps {
  debts: Debt[];
  debtPayments: DebtPayment[];
  accounts: Account[];
  onAddDebt: (debtData: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'>) => void;
  onUpdateDebt: (debtData: Debt) => void;
  onDeleteDebt: (debtId: string) => void;
  onAddDebtPayment: (paymentData: Omit<DebtPayment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id'>, createLinkedExpense: boolean, linkedAccountId?: string) => void;
  onFetchDebtStrategyExplanation: (strategy: DebtStrategy) => Promise<void>;
  onFetchDebtProjectionSummary: (projection: DebtProjection, debts: Debt[], strategy: DebtStrategy) => Promise<void>;
  isPrivacyModeEnabled?: boolean;
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

  const handleCalculateProjection = () => {
    setIsLoadingProjection(true);
    setProjection(null);
    const activeDebts = debts.filter(d => !d.is_archived && d.current_balance > 0);
    if (activeDebts.length === 0) {
      alert("Nenhuma dívida ativa para calcular o plano.");
      setIsLoadingProjection(false);
      return;
    }
    const result = calculateDebtPayoff(activeDebts, parseFloat(extraPayment) || 0, selectedStrategy);
    setProjection(result);
    setIsLoadingProjection(false);
  };
  
  const handleFetchExplanation = async (strategy: DebtStrategy) => {
    setIsExplanationModalOpen(true); // Open modal to show loading or result
    await onFetchDebtStrategyExplanation(strategy);
    // App.tsx will handle adding the insight, user will see it in AI Coach.
    // Or, we can adjust to show it here directly if App.tsx returns the insight
    // or updates a state prop passed to this component.
  };
  
  const handleFetchProjectionSummary = async () => {
    if (!projection) return;
    setIsSummaryModalOpen(true); // Open modal
    await onFetchDebtProjectionSummary(projection, debts.filter(d => !d.is_archived && d.current_balance > 0), selectedStrategy);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      <div className="bg-surface dark:bg-surfaceDark p-6 rounded-xl shadow-lg dark:shadow-neutralDark/30 space-y-4">
        <h2 className="text-xl font-semibold text-textBase dark:text-textBaseDark">Estratégia de Quitação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <Input
                label="Pagamento Extra Mensal (R$)"
                id="extraPayment"
                type="number"
                step="0.01"
                min="0"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder="Ex: 100.00"
            />
            <Select
                label="Escolha a Estratégia"
                id="debtStrategy"
                options={strategyOptions}
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value as DebtStrategy)}
            />
        </div>
         <div className="flex flex-wrap gap-2 text-sm">
            <Button variant="ghost" size="sm" onClick={() => handleFetchExplanation('snowball')} className="!text-xs text-blue-600 dark:text-blue-400 hover:underline">
                <LightBulbIcon className="w-3.5 h-3.5 mr-1" /> Entenda: Bola de Neve
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFetchExplanation('avalanche')} className="!text-xs text-blue-600 dark:text-blue-400 hover:underline">
                 <LightBulbIcon className="w-3.5 h-3.5 mr-1" /> Entenda: Avalanche
            </Button>
        </div>
        <Button onClick={handleCalculateProjection} variant="primary" disabled={isLoadingProjection} className="w-full sm:w-auto">
          {isLoadingProjection ? 'Calculando...' : 'Calcular Plano de Quitação'}
        </Button>

        {projection && (
          <div className="mt-4 pt-4 border-t border-borderBase dark:border-borderBaseDark space-y-3">
            <h3 className="text-lg font-semibold">Resultado da Projeção ({strategyOptions.find(s=>s.value === selectedStrategy)?.label}):</h3>
            <p>Tempo para quitar todas as dívidas: <span className="font-bold">{(projection.monthsToPayoff / 12).toFixed(1)} anos</span> ({projection.monthsToPayoff} meses)</p>
            <p>Total de Juros Pagos: <span className="font-bold">{formatCurrency(projection.totalInterestPaid, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span></p>
            <p>Total Principal Pago: <span className="font-bold">{formatCurrency(projection.totalPrincipalPaid, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span></p>
            
            <h4 className="text-md font-semibold mt-2">Ordem de Quitação:</h4>
            <ul className="list-decimal list-inside text-sm space-y-1">
              {projection.payoffDetails.map(detail => {
                const debt = debts.find(d => d.id === detail.debtId);
                return (
                  <li key={detail.debtId}>
                    <strong>{debt?.name || 'Dívida Desconhecida'}</strong>: Quitada em {detail.monthsToPayoffThisDebt} meses. Juros pagos nesta dívida: {formatCurrency(detail.interestPaidThisDebt, 'BRL', 'pt-BR', isPrivacyModeEnabled)}.
                  </li>
                );
              })}
            </ul>
            <Button variant="ghost" size="sm" onClick={handleFetchProjectionSummary} className="!text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2">
                <LightBulbIcon className="w-3.5 h-3.5 mr-1" /> Obter Resumo da IA sobre este plano
            </Button>
          </div>
        )}
      </div>


      {debts.filter(d => !d.is_archived).length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.filter(d => !d.is_archived).sort((a,b) => a.name.localeCompare(b.name)).map(debt => (
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
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">
          Nenhuma dívida cadastrada. Adicione suas dívidas para começar a planejar!
        </p>
      )}

      {isDebtFormModalOpen && (
        <DebtFormModal
          isOpen={isDebtFormModalOpen}
          onClose={() => setIsDebtFormModalOpen(false)}
          onSave={editingDebt ? (data) => onUpdateDebt({...(data as Debt), id: editingDebt.id}) : onAddDebt}
          existingDebt={editingDebt}
        />
      )}
      {isPaymentFormModalOpen && selectedDebtForPayment && (
        <DebtPaymentFormModal
          isOpen={isPaymentFormModalOpen}
          onClose={() => setIsPaymentFormModalOpen(false)}
          onSave={onAddDebtPayment}
          debt={selectedDebtForPayment}
          accounts={accounts}
        />
      )}
      
      <Modal isOpen={isExplanationModalOpen} onClose={() => setIsExplanationModalOpen(false)} title="Explicação da Estratégia (IA)">
        <p className="text-textMuted dark:text-textMutedDark">Buscando explicação da IA... Verifique o AI Coach para a resposta completa.</p>
      </Modal>
      <Modal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} title="Resumo do Plano (IA)">
        <p className="text-textMuted dark:text-textMutedDark">Buscando resumo da IA... Verifique o AI Coach para a resposta completa.</p>
      </Modal>

    </div>
  );
};

export default DebtPlannerView;
