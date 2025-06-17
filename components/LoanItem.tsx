
import React from 'react';
import { Loan, LoanRepayment, LoanStatus, Account, CreditCard } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon'; // Add TrashIcon import
import PlusIcon from './icons/PlusIcon'; 
import UsersIcon from './icons/UsersIcon';

interface LoanItemProps {
  loan: Loan;
  repayments: LoanRepayment[]; 
  accounts: Account[]; 
  creditCards: CreditCard[]; 
  onEdit: (loan: Loan) => void;
  onDelete: (loanId: string) => void;
  onRegisterRepayment: (loan: Loan) => void;
  isPrivacyModeEnabled?: boolean; // New prop
}

const LoanItem: React.FC<LoanItemProps> = ({ 
    loan, repayments, accounts, creditCards, onEdit, onDelete, onRegisterRepayment, isPrivacyModeEnabled
}) => {
  const totalPaid = repayments.reduce((sum, rp) => sum + rp.amount_paid, 0);
  const outstandingBalance = loan.total_amount_to_reimburse - totalPaid;
  
  let status: LoanStatus = 'PENDING';
  let statusColor = 'text-amber-600 dark:text-amber-500';
  let statusBgColor = 'bg-amber-100 dark:bg-amber-500/20';
  let progressColor = 'bg-amber-500';

  if (totalPaid >= loan.total_amount_to_reimburse) {
    status = 'PAID';
    statusColor = 'text-secondary dark:text-secondaryDark';
    statusBgColor = 'bg-emerald-100 dark:bg-emerald-500/20';
    progressColor = 'bg-secondary';
  } else if (totalPaid > 0) {
    status = 'PARTIALLY_PAID';
    statusColor = 'text-blue-600 dark:text-blue-500';
    statusBgColor = 'bg-blue-100 dark:bg-blue-500/20';
    progressColor = 'bg-blue-500';
  }

  const progressPercent = loan.total_amount_to_reimburse > 0 
    ? Math.min((totalPaid / loan.total_amount_to_reimburse) * 100, 100)
    : 0;

  const fundingAccountName = loan.funding_source === 'account' && loan.linked_account_id 
    ? accounts.find(a => a.id === loan.linked_account_id)?.name 
    : null;
  const fundingCreditCardName = loan.funding_source === 'creditCard' && loan.linked_credit_card_id
    ? creditCards.find(cc => cc.id === loan.linked_credit_card_id)?.name
    : null;

  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <UsersIcon className="w-5 h-5 text-primary dark:text-primaryDark" />
            <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">{loan.person_name}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBgColor} ${statusColor}`}>
              {status === 'PENDING' ? 'Pendente' : status === 'PARTIALLY_PAID' ? 'Parcialmente Pago' : 'Pago'}
            </span>
          </div>
          <p className="text-sm text-textMuted dark:text-textMutedDark">
            Emprestado em: {formatDate(loan.loan_date)}
          </p>
          <p className="text-sm text-textMuted dark:text-textMutedDark">
            Total a Reembolsar: <span className="font-semibold">{formatCurrency(loan.total_amount_to_reimburse, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
          </p>
          {loan.description && <p className="text-xs italic text-neutral dark:text-neutralDark mt-1">{loan.description}</p>}
        </div>
        <div className="flex flex-col items-end space-y-1">
           <Button variant="ghost" size="sm" onClick={() => onEdit(loan)} aria-label="Editar Empréstimo" className="!p-1.5">
             <EditIcon className="w-4 h-4" />
           </Button>
           <Button 
             variant="ghost" 
             size="sm" 
             onClick={() => onDelete(loan.id)} 
             aria-label="Excluir Empréstimo" 
             className="!p-1.5"
             disabled={totalPaid > 0 && status !== 'PAID'}
             title={totalPaid > 0 && status !== 'PAID' ? "Exclua os pagamentos primeiro ou quite o empréstimo" : "Excluir Empréstimo"}
           >
             <TrashIcon className={`w-4 h-4 ${(totalPaid > 0 && status !== 'PAID') ? 'text-neutral/50 dark:text-neutralDark/50' : 'text-destructive dark:text-destructiveDark'}`} />
           </Button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-textMuted dark:text-textMutedDark">Pago: {formatCurrency(totalPaid, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
          <span className={`font-semibold ${outstandingBalance <= 0 ? statusColor : 'text-destructive dark:text-destructiveDark'}`}>
            Pendente: {formatCurrency(Math.max(0, outstandingBalance), 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </span>
        </div>
        <div className="w-full progress-bar-bg rounded-full h-2.5 dark:progress-bar-bg">
          <div 
            className={`h-2.5 rounded-full ${progressColor}`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
      
      <div className="text-xs text-textMuted dark:text-textMutedDark pt-2 border-t border-borderBase/20 dark:border-borderBaseDark/30">
        <p><strong>Origem do Dinheiro:</strong></p>
        {loan.funding_source === 'account' && (
          <>
            <p>Conta: {fundingAccountName || 'N/A'}</p>
            <p>Valor Entregue da Conta: {formatCurrency(loan.amount_delivered_from_account || 0, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
          </>
        )}
        {loan.funding_source === 'creditCard' && (
          <>
            <p>Cartão de Crédito: {fundingCreditCardName || 'N/A'}</p>
            <p>Valor Líquido Entregue: {formatCurrency(loan.amount_delivered_from_credit || 0, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
            <p>Custo no Cartão (Fatura): {formatCurrency(loan.cost_on_credit_card || 0, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</p>
          </>
        )}
      </div>

      {status !== 'PAID' && (
        <div className="flex justify-start pt-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => onRegisterRepayment(loan)}
          >
            <PlusIcon className="w-4 h-4 mr-1" /> Registrar Pagamento Recebido
          </Button>
        </div>
      )}
    </li>
  );
};

export default LoanItem;