
import React from 'react';
import { useState, useEffect } from 'react';
import { InstallmentPurchase, CreditCard } from '../types';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { generateId, getISODateString } from '../utils/helpers';

interface InstallmentPurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (purchase: InstallmentPurchase) => void;
  creditCard: CreditCard; // The card this purchase belongs to
  existingPurchase?: InstallmentPurchase | null;
}

const InstallmentPurchaseFormModal: React.FC<InstallmentPurchaseFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  creditCard, 
  existingPurchase 
}) => {
  const [description, setDescription] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(getISODateString());
  const [totalAmount, setTotalAmount] = useState('');
  const [numberOfInstallments, setNumberOfInstallments] = useState('');
  const [installmentsPaid, setInstallmentsPaid] = useState('0'); // Only for edit, defaults to 0 for new
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingPurchase) {
      setDescription(existingPurchase.description);
      setPurchaseDate(existingPurchase.purchaseDate);
      setTotalAmount(existingPurchase.totalAmount.toString());
      setNumberOfInstallments(existingPurchase.numberOfInstallments.toString());
      setInstallmentsPaid(existingPurchase.installmentsPaid.toString());
    } else {
      setDescription('');
      setPurchaseDate(getISODateString());
      setTotalAmount('');
      setNumberOfInstallments('');
      setInstallmentsPaid('0');
    }
    setErrors({});
  }, [existingPurchase, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'Descrição é obrigatória.';
    if (!purchaseDate) newErrors.purchaseDate = 'Data da compra é obrigatória.';
    const numTotalAmount = parseFloat(totalAmount);
    if (isNaN(numTotalAmount) || numTotalAmount <= 0) newErrors.totalAmount = 'Valor total deve ser positivo.';
    const numInstallments = parseInt(numberOfInstallments, 10);
    if (isNaN(numInstallments) || numInstallments <= 0) newErrors.numberOfInstallments = 'Número de parcelas deve ser positivo.';
    const numInstallmentsPaid = parseInt(installmentsPaid, 10);
     if (isNaN(numInstallmentsPaid) || numInstallmentsPaid < 0 || (numInstallments > 0 && numInstallmentsPaid > numInstallments) ) { // check numInstallments > 0
        newErrors.installmentsPaid = 'Parcelas pagas inválido.';
     }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const purchaseData: InstallmentPurchase = {
      id: existingPurchase?.id || generateId(),
      creditCardId: creditCard.id,
      description: description.trim(),
      purchaseDate,
      totalAmount: parseFloat(totalAmount),
      numberOfInstallments: parseInt(numberOfInstallments, 10),
      installmentsPaid: parseInt(installmentsPaid, 10),
    };
    onSave(purchaseData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingPurchase ? 'Editar Compra Parcelada' : 'Nova Compra Parcelada'}>
      <p className="text-sm text-textMuted dark:text-textMutedDark mb-3">Cartão: <span className="font-semibold text-textBase dark:text-textBaseDark">{creditCard.name}</span></p>
      <div className="space-y-4">
        <Input
          label="Descrição da Compra"
          id="purchaseDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          placeholder="Ex: Celular Novo, Geladeira"
        />
        <Input
          label="Data da Compra"
          id="purchaseDate"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          error={errors.purchaseDate}
        />
        <Input
          label="Valor Total (R$)"
          id="totalAmount"
          type="number"
          step="0.01"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          error={errors.totalAmount}
          placeholder="Ex: 1200.00"
        />
        <Input
          label="Número de Parcelas"
          id="numberOfInstallments"
          type="number"
          min="1"
          value={numberOfInstallments}
          onChange={(e) => setNumberOfInstallments(e.target.value)}
          error={errors.numberOfInstallments}
          placeholder="Ex: 12"
        />
        {existingPurchase && (
           <Input
            label="Parcelas Pagas"
            id="installmentsPaid"
            type="number"
            min="0"
            max={numberOfInstallments || undefined} // Ensure max is not set if numberOfInstallments is empty
            value={installmentsPaid}
            onChange={(e) => setInstallmentsPaid(e.target.value)}
            error={errors.installmentsPaid}
          />
        )}
        {errors.form && <p className="text-sm text-destructive dark:text-destructiveDark/90">{errors.form}</p>}
        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>Salvar Compra</Button>
        </div>
      </div>
    </Modal>
  );
};

export default InstallmentPurchaseFormModal;