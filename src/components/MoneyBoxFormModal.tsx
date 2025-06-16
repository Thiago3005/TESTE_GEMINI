import React, { useState } from 'react';
import { useEffect } from 'react';
import { MoneyBox } from '../types';
import { generateId, getISODateString } from '../utils/helpers';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';
import PiggyBankIcon from './icons/PiggyBankIcon'; // Default icon
import Select from './Select';

const defaultColors = [
  "#F87171", // red-400
  "#FBBF24", // amber-400
  "#34D399", // emerald-400
  "#60A5FA", // blue-400
  "#A78BFA", // violet-400
  "#F472B6", // pink-400
];


interface MoneyBoxFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (moneyBox: MoneyBox) => void;
  existingMoneyBox?: MoneyBox | null;
}

const MoneyBoxFormModal: React.FC<MoneyBoxFormModalProps> = ({ isOpen, onClose, onSave, existingMoneyBox }) => {
  const [name, setName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [color, setColor] = useState<string>(defaultColors[0]);
  // Icon state can be added later if more icons are available
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingMoneyBox) {
      setName(existingMoneyBox.name);
      setGoalAmount(existingMoneyBox.goalAmount?.toString() || '');
      setColor(existingMoneyBox.color || defaultColors[0]);
    } else {
      setName('');
      setGoalAmount('');
      setColor(defaultColors[0]);
    }
    setErrors({});
  }, [existingMoneyBox, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome da caixinha é obrigatório.';
    if (goalAmount && (isNaN(parseFloat(goalAmount)) || parseFloat(goalAmount) < 0)) {
      newErrors.goalAmount = 'Meta deve ser um número positivo ou vazio.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const moneyBoxData: MoneyBox = {
      id: existingMoneyBox?.id || generateId(),
      name: name.trim(),
      goalAmount: goalAmount ? parseFloat(goalAmount) : undefined,
      createdAt: existingMoneyBox?.createdAt || getISODateString(),
      icon: 'piggy-bank', // Default icon for now
      color: color,
    };
    onSave(moneyBoxData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingMoneyBox ? 'Editar Caixinha' : 'Nova Caixinha'}>
      <div className="space-y-4">
        <Input
          label="Nome da Caixinha"
          id="moneyBoxName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Ex: Reserva de Emergência, Viagem"
        />
        <Input
          label="Meta de Valor (Opcional)"
          id="moneyBoxGoal"
          type="number"
          step="0.01"
          value={goalAmount}
          onChange={(e) => setGoalAmount(e.target.value)}
          error={errors.goalAmount}
          placeholder="Ex: 1000.00"
        />
        <div>
          <label htmlFor="moneyBoxColor" className="block text-sm font-medium text-textMuted dark:text-textMutedDark mb-1">Cor de Destaque</label>
          <div className="flex space-x-2">
            {defaultColors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-primary dark:border-primaryDark ring-2 ring-primary dark:ring-primaryDark ring-offset-2 dark:ring-offset-surfaceDark' : 'border-transparent hover:border-neutral/50 dark:hover:border-neutralDark/50'}`}
                style={{ backgroundColor: c }}
                aria-label={`Selecionar cor ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </div>

        {errors.form && <p className="text-sm text-destructive dark:text-destructiveDark/90">{errors.form}</p>}
        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>Salvar Caixinha</Button>
        </div>
      </div>
    </Modal>
  );
};

export default MoneyBoxFormModal;