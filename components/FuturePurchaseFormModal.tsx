import React from 'react';
import { useState, useEffect, ChangeEvent } from 'react';
import { FuturePurchase, FuturePurchasePriority } from '../types';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import { generateId, getISODateString } from '../utils/helpers';

interface FuturePurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (purchase: Omit<FuturePurchase, 'status' | 'aiAnalysis' | 'aiAnalyzedAt'>) => void;
  existingPurchase?: FuturePurchase | null;
}

const priorityOptions: { value: FuturePurchasePriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

const FuturePurchaseFormModal: React.FC<FuturePurchaseFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingPurchase,
}) => {
  const [name, setName] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [priority, setPriority] = useState<FuturePurchasePriority>('medium');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (existingPurchase) {
        setName(existingPurchase.name);
        setEstimatedCost(existingPurchase.estimatedCost.toString());
        setPriority(existingPurchase.priority);
        setNotes(existingPurchase.notes || '');
      } else {
        setName('');
        setEstimatedCost('');
        setPriority('medium');
        setNotes('');
      }
      setErrors({});
    }
  }, [existingPurchase, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome do item é obrigatório.';
    const cost = parseFloat(estimatedCost);
    if (isNaN(cost) || cost <= 0) newErrors.estimatedCost = 'Custo estimado deve ser um número positivo.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const purchaseData: Omit<FuturePurchase, 'status' | 'aiAnalysis' | 'aiAnalyzedAt'> = {
      id: existingPurchase?.id || generateId(),
      name: name.trim(),
      estimatedCost: parseFloat(estimatedCost),
      priority,
      notes: notes.trim() || undefined,
      createdAt: existingPurchase?.createdAt || getISODateString(),
      // status, aiAnalysis, and aiAnalyzedAt are handled by App.tsx logic
    };
    onSave(purchaseData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingPurchase ? 'Editar Compra Futura' : 'Nova Compra Futura'} size="md">
      <div className="space-y-4">
        <Input
          label="Nome do Item/Objetivo"
          id="fpName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Ex: Novo Celular, Viagem para a Praia"
          required
        />
        <Input
          label="Custo Estimado (R$)"
          id="fpEstimatedCost"
          type="number"
          step="0.01"
          value={estimatedCost}
          onChange={(e) => setEstimatedCost(e.target.value)}
          error={errors.estimatedCost}
          placeholder="Ex: 2500.00"
          required
        />
        <Select
          label="Prioridade"
          id="fpPriority"
          options={priorityOptions}
          value={priority}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as FuturePurchasePriority)}
        />
        <Textarea
          label="Notas (Opcional)"
          id="fpNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Detalhes adicionais, link do produto, etc."
        />
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="primary" onClick={handleSubmit}>
            {existingPurchase ? 'Salvar Alterações' : 'Adicionar Compra'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FuturePurchaseFormModal;