
import React, { useState, useEffect } from 'react';
import { CreditCard, Account } from '../types';
import Modal from './Modal';
import Select from './Select';
import Button from './Button';
import { formatCurrency } from '../utils/helpers';
import CreditCardIcon from './icons/CreditCardIcon';
import BanknotesIcon from './icons/BanknotesIcon';

interface PayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billData: {
    card: CreditCard;
    amount: number;
    installmentIds: string[];
  };
  accounts: Account[];
  onConfirmPayment: (cardId: string, fromAccountId: string, billAmount: number, installmentIdsToPay: string[]) => void;
  isPrivacyModeEnabled?: boolean;
}

const PayBillModal: React.FC<PayBillModalProps> = ({
  isOpen,
  onClose,
  billData,
  accounts,
  onConfirmPayment,
  isPrivacyModeEnabled,
}) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFromAccountId(accounts.length > 0 ? accounts[0].id : '');
      setError('');
    }
  }, [isOpen, accounts]);

  const handleConfirm = () => {
    if (!fromAccountId) {
      setError('Por favor, selecione uma conta para realizar o pagamento.');
      return;
    }
    setError('');
    onConfirmPayment(billData.card.id, fromAccountId, billData.amount, billData.installmentIds);
    onClose();
  };

  const accountOptions = accounts.map(acc => ({ value: acc.id, label: acc.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pagar Fatura do Cartão">
      <div className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
                <CreditCardIcon className="w-6 h-6 text-primary dark:text-primaryDark" />
                <h3 className="text-lg font-medium text-textBase dark:text-textBaseDark">{billData.card.name}</h3>
            </div>
            <p className="text-sm text-textMuted dark:text-textMutedDark">Valor total da fatura</p>
            <p className="text-4xl font-bold text-destructive dark:text-destructiveDark my-1">
                {formatCurrency(billData.amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
            </p>
        </div>

        <div className="space-y-4">
          <Select
            label="Pagar com a conta:"
            id="payment-account"
            options={accountOptions}
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            error={error}
            disabled={accounts.length === 0}
            placeholder={accounts.length === 0 ? "Nenhuma conta disponível" : "Selecione uma conta"}
          />
          <p className="text-xs text-textMuted dark:text-textMutedDark">
            Ao confirmar, uma transação de despesa será criada na conta selecionada e as {billData.installmentIds.length} parcelas desta fatura serão marcadas como pagas.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!fromAccountId}>
            <BanknotesIcon className="w-5 h-5 mr-2" />
            Confirmar Pagamento
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PayBillModal;
