import React from 'react';
import { useState, useMemo } from 'react';
import { Debt, DebtPayment, Account } from '../types';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import BanknotesIcon from './icons/BanknotesIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import { formatCurrency, formatDate } from '../utils/helpers';
import DebtFormModal from './DebtFormModal';
import DebtPaymentFormModal from './DebtPaymentFormModal';

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
  isPrivacyModeEnabled,
}) => {
  const [isDebtFormModalOpen, setIsDebtFormModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const [isPaymentFormModalOpen, setIsPaymentFormModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);

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
      <p className="text-xs text-center text-textMuted dark:text-textMutedDark py-4">
        Funcionalidades avançadas como estratégias de pagamento (Bola de Neve, Avalanche) e projeções detalhadas serão adicionadas em breve.
      </p>
    </div>
  );
};

export default DebtPlannerView;
