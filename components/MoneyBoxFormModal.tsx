
import React from 'react';
import { useState, useEffect } from 'react';
import { MoneyBox } from '../types';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
// generateId removed
import PiggyBankIcon from './icons/PiggyBankIcon'; // Default icon

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
  onSave: (moneyBox: Omit<MoneyBox, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => void;
  existingMoneyBox?: MoneyBox | null;
}

const MoneyBoxFormModal: React.FC<MoneyBoxFormModalProps> = ({ isOpen, onClose, onSave, existingMoneyBox }) => {
  const [name, setName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [color, setColor] = useState<string>(defaultColors[0]);
  const [isEmergencyFund, setIsEmergencyFund] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingMoneyBox) {
      setName(existingMoneyBox.name);
      setGoalAmount(existingMoneyBox.goal_amount?.toString() || '');
      setColor(existingMoneyBox.color || defaultColors[0]);
      setIsEmergencyFund(!!existingMoneyBox.is_emergency_fund);
    } else {
      setName('');
      setGoalAmount('');
      setColor(defaultColors[0]);
      setIsEmergencyFund(false);
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

    const moneyBoxData: Omit<MoneyBox, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> = {
      // id, user_id, profile_id, created_at, updated_at are handled by Supabase/App.tsx
      name: name.trim(),
      goal_amount: goalAmount ? parseFloat(goalAmount) : undefined,
      icon: 'piggy-bank', // Default icon for now
      color: color,
      is_emergency_fund: isEmergencyFund,
    };
    const finalData = existingMoneyBox ? { ...moneyBoxData, id: existingMoneyBox.id } : moneyBoxData;
    onSave(finalData as any);
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

        <div className="pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                id="isEmergencyFund"
                checked={isEmergencyFund}
                onChange={(e) => setIsEmergencyFund(e.target.checked)}
                className="rounded text-primary dark:text-primaryDark focus:ring-primary dark:focus:ring-primaryDark bg-surface dark:bg-surfaceDark border-borderBase dark:border-borderBaseDark shadow-sm"
              />
              <span className="text-sm text-textMuted dark:text-textMutedDark">
                Marcar como Reserva de Emergência
              </span>
            </label>
            <p className="text-xs text-textMuted dark:text-textMutedDark/70 mt-1 ml-6">Apenas uma caixinha pode ser a reserva de emergência. Ela será usada para calcular seu Score de Saúde Financeira.</p>
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
