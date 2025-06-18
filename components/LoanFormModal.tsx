
import React from 'react';
import { useState, useEffect, ChangeEvent } from 'react';
import { Loan, Account, CreditCard } from '../types';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import Textarea from './Textarea';
import { getISODateString, formatCurrency } from '../utils/helpers'; // generateId removed

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: Omit<Loan, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id' | 'linked_installment_purchase_id'>, ccInstallments?: number) => void;
  accounts: Account[];
  creditCards: CreditCard[];
  existingLoan?: Loan | null;
}

const LoanFormModal: React.FC<LoanFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  creditCards,
  existingLoan,
}) => {
  const [personName, setPersonName] = useState('');
  const [loanDate, setLoanDate] = useState(getISODateString());
  const [description, setDescription] = useState('');
  const [totalAmountToReimburse, setTotalAmountToReimburse] = useState('');
  
  const [fundingSource, setFundingSource] = useState<'account' | 'creditCard'>('account');
  
  // Account funding
  const [amountDeliveredFromAccount, setAmountDeliveredFromAccount] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  
  // Credit card funding
  const [amountDeliveredFromCredit, setAmountDeliveredFromCredit] = useState('');
  const [costOnCreditCard, setCostOnCreditCard] = useState('');
  const [linkedCreditCardId, setLinkedCreditCardId] = useState('');
  const [numberOfInstallments, setNumberOfInstallments] = useState('1'); // For the CC operation

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (existingLoan) {
        setPersonName(existingLoan.person_name);
        setLoanDate(existingLoan.loan_date);
        setDescription(existingLoan.description || '');
        setTotalAmountToReimburse(existingLoan.total_amount_to_reimburse.toString());
        setFundingSource(existingLoan.funding_source);

        if (existingLoan.funding_source === 'account') {
          setAmountDeliveredFromAccount(existingLoan.amount_delivered_from_account?.toString() || '');
          setLinkedAccountId(existingLoan.linked_account_id || '');
        } else {
          setAmountDeliveredFromAccount('');
          setLinkedAccountId('');
        }

        if (existingLoan.funding_source === 'creditCard') {
          setAmountDeliveredFromCredit(existingLoan.amount_delivered_from_credit?.toString() || '');
          setCostOnCreditCard(existingLoan.cost_on_credit_card?.toString() || '');
          setLinkedCreditCardId(existingLoan.linked_credit_card_id || '');
        } else {
          setAmountDeliveredFromCredit('');
          setCostOnCreditCard('');
          setLinkedCreditCardId('');
        }
      } else {
        setPersonName('');
        setLoanDate(getISODateString());
        setDescription('');
        setTotalAmountToReimburse('');
        setFundingSource('account');
        setAmountDeliveredFromAccount('');
        setLinkedAccountId(accounts.length > 0 ? accounts[0].id : '');
        setAmountDeliveredFromCredit('');
        setCostOnCreditCard('');
        setLinkedCreditCardId(creditCards.length > 0 ? creditCards[0].id : '');
        setNumberOfInstallments('1');
      }
      setErrors({});
    }
  }, [existingLoan, isOpen, accounts, creditCards]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!personName.trim()) newErrors.personName = 'Nome da pessoa é obrigatório.';
    if (!loanDate) newErrors.loanDate = 'Data do empréstimo é obrigatória.';
    const numTotalReimburse = parseFloat(totalAmountToReimburse);
    if (isNaN(numTotalReimburse) || numTotalReimburse <= 0) newErrors.totalAmountToReimburse = 'Valor a ser reembolsado deve ser positivo.';

    if (fundingSource === 'account') {
      if (!linkedAccountId) newErrors.linkedAccountId = 'Conta de origem é obrigatória.';
      const numAmountDelivered = parseFloat(amountDeliveredFromAccount);
      if (isNaN(numAmountDelivered) || numAmountDelivered <= 0) newErrors.amountDeliveredFromAccount = 'Valor entregue deve ser positivo.';
    } else if (fundingSource === 'creditCard') {
      if (!linkedCreditCardId) newErrors.linkedCreditCardId = 'Cartão de crédito é obrigatório.';
      const numAmountDeliveredCC = parseFloat(amountDeliveredFromCredit);
      if (isNaN(numAmountDeliveredCC) || numAmountDeliveredCC <= 0) newErrors.amountDeliveredFromCredit = 'Valor entregue (líquido) deve ser positivo.';
      const numCostOnCC = parseFloat(costOnCreditCard);
      if (isNaN(numCostOnCC) || numCostOnCC <= 0) newErrors.costOnCreditCard = 'Custo no cartão deve ser positivo.';
      if (numAmountDeliveredCC > numCostOnCC) newErrors.amountDeliveredFromCredit = 'Valor entregue não pode ser maior que o custo no cartão.';
      const numInstallments = parseInt(numberOfInstallments, 10);
      if (isNaN(numInstallments) || numInstallments <= 0) newErrors.numberOfInstallments = 'Número de parcelas deve ser positivo.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const baseLoanData = {
      person_name: personName.trim(),
      loan_date: loanDate,
      description: description.trim() || undefined,
      total_amount_to_reimburse: parseFloat(totalAmountToReimburse),
      funding_source: fundingSource,
    };

    let fullLoanData: Omit<Loan, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'linked_expense_transaction_id' | 'linked_installment_purchase_id'>;

    if (fundingSource === 'account') {
      fullLoanData = {
        ...baseLoanData,
        amount_delivered_from_account: parseFloat(amountDeliveredFromAccount),
        linked_account_id: linkedAccountId,
      };
    } else { // creditCard
      fullLoanData = {
        ...baseLoanData,
        amount_delivered_from_credit: parseFloat(amountDeliveredFromCredit),
        cost_on_credit_card: parseFloat(costOnCreditCard),
        linked_credit_card_id: linkedCreditCardId,
      };
    }
    
    const loanToSave = existingLoan ? { ...fullLoanData, id: existingLoan.id } : fullLoanData;

    onSave(loanToSave as any, fundingSource === 'creditCard' ? parseInt(numberOfInstallments) : undefined);
    onClose();
  };
  
  const fundingSourceOptions = [
      { value: 'account', label: 'Dinheiro de uma Conta' },
      { value: 'creditCard', label: 'Crédito (Convertido em Dinheiro)' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingLoan ? 'Editar Empréstimo' : 'Novo Empréstimo'} size="lg">
      <div className="space-y-4">
        <Input label="Nome da Pessoa" id="personName" value={personName} onChange={(e) => setPersonName(e.target.value)} error={errors.personName} required />
        <Input label="Data do Empréstimo" id="loanDate" type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} error={errors.loanDate} required />
        <Textarea label="Descrição (Opcional)" id="loanDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        
        <Input
          label="Valor Total a Ser Reembolsado por Você (R$)"
          id="totalAmountToReimburse"
          type="number"
          step="0.01"
          value={totalAmountToReimburse}
          onChange={(e) => setTotalAmountToReimburse(e.target.value)}
          error={errors.totalAmountToReimburse}
          placeholder="Ex: 270.00"
          required
        />

        <Select
            label="Origem do Dinheiro"
            id="fundingSource"
            options={fundingSourceOptions}
            value={fundingSource}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFundingSource(e.target.value as 'account' | 'creditCard')}
        />

        {fundingSource === 'account' && (
          <div className="space-y-4 p-3 border border-borderBase dark:border-borderBaseDark rounded-md">
            <h3 className="text-sm font-medium text-textMuted dark:text-textMutedDark">Detalhes (Saída de Conta)</h3>
            <Select
              label="Conta de Origem"
              id="linkedAccountId"
              options={accounts.map(a => ({ value: a.id, label: a.name }))}
              value={linkedAccountId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setLinkedAccountId(e.target.value)}
              error={errors.linkedAccountId}
              disabled={accounts.length === 0}
              required
            />
            <Input
              label="Valor Efetivamente Entregue (R$)"
              id="amountDeliveredFromAccount"
              type="number"
              step="0.01"
              value={amountDeliveredFromAccount}
              onChange={(e) => setAmountDeliveredFromAccount(e.target.value)}
              error={errors.amountDeliveredFromAccount}
              placeholder="Ex: 250.00"
              required
            />
          </div>
        )}

        {fundingSource === 'creditCard' && (
          <div className="space-y-4 p-3 border border-borderBase dark:border-borderBaseDark rounded-md">
            <h3 className="text-sm font-medium text-textMuted dark:text-textMutedDark">Detalhes (Uso de Crédito)</h3>
             <p className="text-xs text-textMuted dark:text-textMutedDark">
                Use esta opção se você usou um serviço do cartão para sacar/transferir crédito, incorrendo em taxas.
                O "Custo Real no Cartão" será lançado como uma compra parcelada.
             </p>
            <Select
              label="Cartão de Crédito Utilizado"
              id="linkedCreditCardId"
              options={creditCards.map(cc => ({ value: cc.id, label: cc.name }))}
              value={linkedCreditCardId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setLinkedCreditCardId(e.target.value)}
              error={errors.linkedCreditCardId}
              disabled={creditCards.length === 0}
              required
            />
            <Input
              label="Valor Efetivamente Entregue à Pessoa (R$)"
              id="amountDeliveredFromCredit"
              type="number"
              step="0.01"
              value={amountDeliveredFromCredit}
              onChange={(e) => setAmountDeliveredFromCredit(e.target.value)}
              error={errors.amountDeliveredFromCredit}
              placeholder={`Ex: ${formatCurrency(250.00)} (valor líquido recebido pela pessoa)`}
              required
            />
            <Input
              label="Custo Real no Cartão (com taxas) (R$)"
              id="costOnCreditCard"
              type="number"
              step="0.01"
              value={costOnCreditCard}
              onChange={(e) => {
                setCostOnCreditCard(e.target.value);
                if (!existingLoan && !totalAmountToReimburse) {
                    setTotalAmountToReimburse(e.target.value);
                }
              }}
              error={errors.costOnCreditCard}
              placeholder="Ex: 270.00 (valor total que virá na fatura)"
              required
            />
            <Input
              label="Número de Parcelas no Cartão"
              id="numberOfInstallments"
              type="number"
              min="1"
              value={numberOfInstallments}
              onChange={(e) => setNumberOfInstallments(e.target.value)}
              error={errors.numberOfInstallments}
              required
              disabled={!!existingLoan && !!existingLoan.linked_installment_purchase_id}
              title={!!existingLoan && !!existingLoan.linked_installment_purchase_id ? "Número de parcelas não pode ser alterado após a criação da compra vinculada." : ""}
            />
          </div>
        )}
        
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="primary" onClick={handleSubmit}>Salvar Empréstimo</Button>
        </div>
      </div>
    </Modal>
  );
};

export default LoanFormModal;