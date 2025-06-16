import React, { useState } from 'react';
import { useEffect, ChangeEvent } from 'react';
import { Loan, LoanRepayment, Account, Transaction } from '../types';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import Textarea from './Textarea';
import { generateId, getISODateString } from '../utils/helpers';

interface LoanRepaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repayment: Omit<LoanRepayment, 'id' | 'loanId' | 'linkedIncomeTransactionId'>, loanId: string) => void;
  loan: Loan;
  accounts: Account[];
}

const LoanRepaymentFormModal: React.FC<LoanRepaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loan,
  accounts,
}) => {
  const [amountPaid, setAmountPaid] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(getISODateString());
  const [creditedAccountId, setCreditedAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setAmountPaid('');
      setRepaymentDate(getISODateString());
      setCreditedAccountId(accounts.length > 0 ? accounts[0].id : '');
      setNotes('');
      setErrors({});
    }
  }, [isOpen, accounts]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const numAmountPaid = parseFloat(amountPaid);
    if (isNaN(numAmountPaid) || numAmountPaid <= 0) {
      newErrors.amountPaid = 'Valor pago deve ser positivo.';
    }
    // Potentially check if amountPaid exceeds remaining loan balance, but allow overpayment for simplicity for now.
    // const remainingBalance = calculateRemainingBalance();
    // if (numAmountPaid > remainingBalance) newErrors.amountPaid = `Valor excede o saldo devedor (${formatCurrency(remainingBalance)}).`;

    if (!repaymentDate) newErrors.repaymentDate = 'Data do pagamento é obrigatória.';
    if (!creditedAccountId) newErrors.creditedAccountId = 'Conta de crédito é obrigatória.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const repaymentData: Omit<LoanRepayment, 'id' | 'loanId' | 'linkedIncomeTransactionId'> = {
      repaymentDate,
      amountPaid: parseFloat(amountPaid),
      notes: notes.trim() || undefined,
      creditedAccountId,
    };
    onSave(repaymentData, loan.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Pagamento: ${loan.personName}`}>
      <div className="space-y-4">
        <Input
          label="Valor Recebido (R$)"
          id="repaymentAmount"
          type="number"
          step="0.01"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          error={errors.amountPaid}
          required
        />
        <Input
          label="Data do Recebimento"
          id="repaymentDate"
          type="date"
          value={repaymentDate}
          onChange={(e) => setRepaymentDate(e.target.value)}
          error={errors.repaymentDate}
          required
        />
        <Select
          label="Conta Creditada (Onde o dinheiro entrou)"
          id="creditedAccountId"
          options={accounts.map(a => ({ value: a.id, label: a.name }))}
          value={creditedAccountId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCreditedAccountId(e.target.value)}
          error={errors.creditedAccountId}
          disabled={accounts.length === 0}
          required
        />
        <Textarea
          label="Notas (Opcional)"
          id="repaymentNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="primary" onClick={handleSubmit}>Salvar Pagamento</Button>
        </div>
      </div>
    </Modal>
  );
};

export default LoanRepaymentFormModal;
