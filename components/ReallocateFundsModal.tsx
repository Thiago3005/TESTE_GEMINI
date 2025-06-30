
import React, { useState, useEffect } from 'react';
import { MoneyBox } from '../types';
import Modal from './Modal';
import Select from './Select';
import Input from './Input';
import Button from './Button';
import { formatCurrency } from '../utils/helpers';

interface ReallocateFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moneyBoxes: MoneyBox[];
  onConfirmReallocation: (fromMoneyBoxId: string, toMoneyBoxId: string, amount: number) => void;
  calculateMoneyBoxBalance: (moneyBoxId: string) => number;
  isPrivacyModeEnabled?: boolean;
}

const ReallocateFundsModal: React.FC<ReallocateFundsModalProps> = ({
  isOpen,
  onClose,
  moneyBoxes,
  onConfirmReallocation,
  calculateMoneyBoxBalance,
  isPrivacyModeEnabled,
}) => {
  const [fromMoneyBoxId, setFromMoneyBoxId] = useState('');
  const [toMoneyBoxId, setToMoneyBoxId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && moneyBoxes.length > 0) {
      setFromMoneyBoxId(moneyBoxes[0].id);
      setToMoneyBoxId(moneyBoxes.length > 1 ? moneyBoxes[1].id : '');
      setAmount('');
      setError('');
    }
  }, [isOpen, moneyBoxes]);

  const validate = (): boolean => {
    const fromBalance = calculateMoneyBoxBalance(fromMoneyBoxId);
    const numAmount = parseFloat(amount);
    if (!fromMoneyBoxId || !toMoneyBoxId) {
      setError('Selecione a caixinha de origem e destino.');
      return false;
    }
    if (fromMoneyBoxId === toMoneyBoxId) {
      setError('A origem e o destino não podem ser iguais.');
      return false;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('O valor da transferência deve ser positivo.');
      return false;
    }
    if (numAmount > fromBalance) {
      setError(`Saldo insuficiente na caixinha de origem (Saldo: ${formatCurrency(fromBalance, 'BRL', 'pt-BR', isPrivacyModeEnabled)}).`);
      return false;
    }
    setError('');
    return true;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirmReallocation(fromMoneyBoxId, toMoneyBoxId, parseFloat(amount));
    onClose();
  };

  const moneyBoxOptions = moneyBoxes.map(mb => ({
    value: mb.id,
    label: `${mb.name} (${formatCurrency(calculateMoneyBoxBalance(mb.id), 'BRL', 'pt-BR', isPrivacyModeEnabled)})`
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transferir Fundos entre Caixinhas">
      <div className="space-y-4">
        <Select
          label="De:"
          id="from-moneybox"
          options={moneyBoxOptions}
          value={fromMoneyBoxId}
          onChange={(e) => setFromMoneyBoxId(e.target.value)}
        />
        <Select
          label="Para:"
          id="to-moneybox"
          options={moneyBoxOptions.filter(opt => opt.value !== fromMoneyBoxId)}
          value={toMoneyBoxId}
          onChange={(e) => setToMoneyBoxId(e.target.value)}
          placeholder="Selecione o destino"
        />
        <Input
          label="Valor a Transferir (R$)"
          id="reallocate-amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error}
          placeholder="Ex: 50.00"
        />
        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm}>Confirmar Transferência</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReallocateFundsModal;
