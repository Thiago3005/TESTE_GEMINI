
import React from 'react';
import { useState, useMemo } from 'react';
import { Loan, LoanRepayment, Account, CreditCard } from '../types';
import LoanItem from './LoanItem';
import LoanFormModal from './LoanFormModal';
import LoanRepaymentFormModal from './LoanRepaymentFormModal';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import { formatCurrency } from '../utils/helpers';

interface LoansViewProps {
  loans: Loan[];
  loanRepayments: LoanRepayment[]; 
  accounts: Account[];
  creditCards: CreditCard[];
  onAddLoan: (loanData: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id' | 'linked_installment_purchase_id'>, ccInstallments?: number) => void; 
  onUpdateLoan: (loanData: Loan) => void; // Update to expect full Loan object
  onDeleteLoan: (loanId: string) => void;
  onAddLoanRepayment: (repaymentData: Omit<LoanRepayment, 'id' | 'loan_id' | 'user_id' | 'created_at' | 'updated_at' | 'linked_income_transaction_id'>, loanId: string) => void;
  isPrivacyModeEnabled?: boolean; // New prop
}

const LoansView: React.FC<LoansViewProps> = ({
  loans,
  loanRepayments,
  accounts,
  creditCards,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onAddLoanRepayment,
  isPrivacyModeEnabled,
}) => {
  const [isLoanFormModalOpen, setIsLoanFormModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [selectedLoanForRepayment, setSelectedLoanForRepayment] = useState<Loan | null>(null);

  const openLoanFormModalForNew = () => {
    setEditingLoan(null);
    setIsLoanFormModalOpen(true);
  };

  const openLoanFormModalForEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setIsLoanFormModalOpen(true);
  };
  
  const handleSaveLoan = (loanData: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id' | 'linked_installment_purchase_id'> & {id?: string}, ccInstallments?: number) => {
    if (editingLoan && loanData.id) { // Ensure id is present for updates
        // For updates, we pass the full existing loan object merged with changes
        // The form only provides a subset of fields, so merge with existingLoan
        onUpdateLoan({ ...editingLoan, ...loanData } as Loan);
    } else {
      onAddLoan(loanData, ccInstallments);
    }
  };


  const openRepaymentModal = (loan: Loan) => {
    setSelectedLoanForRepayment(loan);
    setIsRepaymentModalOpen(true);
  };

  const totalOutstandingLoanAmount = useMemo(() => {
    return loans.reduce((total, loan) => {
      const paidForThisLoan = loanRepayments
        .filter(rp => rp.loan_id === loan.id)
        .reduce((sum, rp) => sum + rp.amount_paid, 0);
      return total + (loan.total_amount_to_reimburse - paidForThisLoan);
    }, 0);
  }, [loans, loanRepayments]);
  
  const sortedLoans = useMemo(() => {
    return [...loans].sort((a,b) => new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime());
  }, [loans]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Empréstimos Concedidos</h1>
            {loans.length > 0 && (
                <p className="text-sm text-textMuted dark:text-textMutedDark">
                    Total a receber: <span className="font-semibold text-primary dark:text-primaryDark">{formatCurrency(totalOutstandingLoanAmount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
                </p>
            )}
        </div>
        <Button onClick={openLoanFormModalForNew} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Novo Empréstimo
        </Button>
      </div>

      {sortedLoans.length > 0 ? (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedLoans.map(loan => (
            <LoanItem
              key={loan.id}
              loan={loan}
              repayments={loanRepayments.filter(rp => rp.loan_id === loan.id)}
              accounts={accounts}
              creditCards={creditCards}
              onEdit={openLoanFormModalForEdit}
              onDelete={onDeleteLoan}
              onRegisterRepayment={openRepaymentModal}
              isPrivacyModeEnabled={isPrivacyModeEnabled}
            />
          ))}
        </ul>
      ) : (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">
          Nenhum empréstimo registrado. Clique em "Novo Empréstimo" para começar.
        </p>
      )}

      {/* Pass isPrivacyModeEnabled to modals if they display currency */}
      {isLoanFormModalOpen && (
        <LoanFormModal
          isOpen={isLoanFormModalOpen}
          onClose={() => setIsLoanFormModalOpen(false)}
          onSave={handleSaveLoan}
          accounts={accounts}
          creditCards={creditCards}
          existingLoan={editingLoan}
          // isPrivacyModeEnabled={isPrivacyModeEnabled} // Pass if needed for amount placeholders
        />
      )}

      {isRepaymentModalOpen && selectedLoanForRepayment && (
        <LoanRepaymentFormModal
          isOpen={isRepaymentModalOpen}
          onClose={() => setIsRepaymentModalOpen(false)}
          onSave={onAddLoanRepayment}
          loan={selectedLoanForRepayment}
          accounts={accounts}
          // isPrivacyModeEnabled={isPrivacyModeEnabled} // Pass if needed for amount placeholders
        />
      )}
    </div>
  );
};

export default LoansView;