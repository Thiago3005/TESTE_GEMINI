
import React, { useState } from 'react';
import { Category, MoneyBox, TransactionType } from '../types';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { formatCurrency } from '../utils/helpers';
import UserCircleIcon from './icons/UserCircleIcon';
import SparklesIcon from './icons/SparklesIcon';

interface OnboardingWizardProps {
  isOpen: boolean;
  onSetMonthlyIncome: (income: number) => void;
  onAddBudgets: (categoriesToUpdate: Category[]) => void;
  onAddMoneyBox: (moneyBox: Omit<MoneyBox, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'>) => void;
  onComplete: () => void;
  categories: Category[];
  isPrivacyModeEnabled?: boolean;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onSetMonthlyIncome,
  onAddBudgets,
  onAddMoneyBox,
  onComplete,
  categories,
  isPrivacyModeEnabled,
}) => {
  const [step, setStep] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [budgetAlimentacao, setBudgetAlimentacao] = useState('');
  const [budgetTransporte, setBudgetTransporte] = useState('');
  const [budgetLazer, setBudgetLazer] = useState('');
  const [moneyBoxName, setMoneyBoxName] = useState('Reserva de Emergência');
  const [moneyBoxGoal, setMoneyBoxGoal] = useState('');

  const handleNext = () => {
    if (step === 1) { // After income step
      if (monthlyIncome && parseFloat(monthlyIncome) > 0) {
        onSetMonthlyIncome(parseFloat(monthlyIncome));
      }
    }
    if (step === 2) { // After budgets step
      const budgetsToUpdate: Category[] = [];
      const alimentacaoCat = categories.find(c => c.name === 'Alimentação' && c.type === TransactionType.EXPENSE);
      const transporteCat = categories.find(c => c.name === 'Transporte' && c.type === TransactionType.EXPENSE);
      const lazerCat = categories.find(c => c.name === 'Lazer' && c.type === TransactionType.EXPENSE);

      if (alimentacaoCat && parseFloat(budgetAlimentacao) > 0) {
        budgetsToUpdate.push({ ...alimentacaoCat, monthly_budget: parseFloat(budgetAlimentacao) });
      }
      if (transporteCat && parseFloat(budgetTransporte) > 0) {
        budgetsToUpdate.push({ ...transporteCat, monthly_budget: parseFloat(budgetTransporte) });
      }
      if (lazerCat && parseFloat(budgetLazer) > 0) {
        budgetsToUpdate.push({ ...lazerCat, monthly_budget: parseFloat(budgetLazer) });
      }
      if (budgetsToUpdate.length > 0) {
        onAddBudgets(budgetsToUpdate);
      }
    }
    if (step === 3) { // After money box step
        if (moneyBoxName.trim()) {
            onAddMoneyBox({
                name: moneyBoxName.trim(),
                goal_amount: moneyBoxGoal ? parseFloat(moneyBoxGoal) : undefined,
                icon: 'piggy-bank',
                color: '#60A5FA' // Default blue
            });
        }
    }
    setStep(step + 1);
  };
  
  const handleComplete = () => {
      handleNext(); // Process final step data
      onComplete();
  }

  const renderStep = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <div className="text-center">
            <UserCircleIcon className="w-16 h-16 text-primary dark:text-primaryDark mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Bem-vindo(a) ao seu Painel Financeiro!</h2>
            <p className="mt-2 text-textMuted dark:text-textMutedDark">Vamos fazer uma configuração rápida para personalizar sua experiência.</p>
          </div>
        );
      case 1: // Monthly Income
        return (
          <div>
            <h2 className="text-xl font-semibold mb-3">Qual sua renda mensal?</h2>
            <p className="text-sm text-textMuted dark:text-textMutedDark mb-4">
              Esta informação é opcional, mas ajuda a IA a fornecer sugestões e análises mais precisas.
            </p>
            <Input
              label="Renda Mensal (R$)"
              id="onboarding-income"
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              placeholder={isPrivacyModeEnabled ? formatCurrency(0, 'BRL', 'pt-BR', true).replace('0,00', 'Ex: 4000.00') : "Ex: 4000.00"}
            />
          </div>
        );
      case 2: // Budgets
        return (
          <div>
            <h2 className="text-xl font-semibold mb-3">Defina seus primeiros orçamentos</h2>
            <p className="text-sm text-textMuted dark:text-textMutedDark mb-4">
              Comece com algumas das categorias mais comuns. Você pode adicionar ou editar mais depois.
            </p>
            <div className="space-y-3">
              <Input label="Orçamento para Alimentação (R$)" id="budget-food" type="number" value={budgetAlimentacao} onChange={(e) => setBudgetAlimentacao(e.target.value)} placeholder="Ex: 800" />
              <Input label="Orçamento para Transporte (R$)" id="budget-transport" type="number" value={budgetTransporte} onChange={(e) => setBudgetTransporte(e.target.value)} placeholder="Ex: 250" />
              <Input label="Orçamento para Lazer (R$)" id="budget-leisure" type="number" value={budgetLazer} onChange={(e) => setBudgetLazer(e.target.value)} placeholder="Ex: 300" />
            </div>
          </div>
        );
       case 3: // Money Box
        return (
          <div>
            <h2 className="text-xl font-semibold mb-3">Crie sua primeira meta de economia!</h2>
            <p className="text-sm text-textMuted dark:text-textMutedDark mb-4">
                As "Caixinhas" ajudam você a separar dinheiro para objetivos específicos.
            </p>
            <div className="space-y-3">
               <Input label="Nome da Caixinha" id="moneybox-name" type="text" value={moneyBoxName} onChange={(e) => setMoneyBoxName(e.target.value)} />
               <Input label="Meta de Valor (Opcional)" id="moneybox-goal" type="number" value={moneyBoxGoal} onChange={(e) => setMoneyBoxGoal(e.target.value)} placeholder="Ex: 5000" />
            </div>
          </div>
        );
      case 4: // Finish
        return (
          <div className="text-center">
             <SparklesIcon className="w-16 h-16 text-secondary dark:text-secondaryDark mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Tudo pronto!</h2>
            <p className="mt-2 text-textMuted dark:text-textMutedDark">Sua configuração inicial está completa. Explore seu painel financeiro!</p>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Configuração Inicial" size="lg">
      <div className="p-4">
        {renderStep()}
        <div className="mt-8 flex justify-end space-x-3">
          {step > 0 && step < 4 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 4 && <Button variant="primary" onClick={handleNext}>Próximo</Button>}
          {step === 4 && <Button variant="primary" onClick={onComplete}>Começar a Usar!</Button>}
        </div>
      </div>
    </Modal>
  );
};

export default OnboardingWizard;
