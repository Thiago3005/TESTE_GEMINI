





import React from 'react';
import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Debt, DebtType, Account, DebtRateAnalysis, DebtViabilityAnalysis } from '../types';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { getISODateString, formatCurrency } from '../utils/helpers';
import LightBulbIcon from './icons/LightBulbIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';
import InfoTooltip from './InfoTooltip';


const debtTypeOptions: { value: DebtType; label: string }[] = [
  { value: 'credit_card_balance', label: 'Saldo de Cartão de Crédito' },
  { value: 'personal_loan', label: 'Empréstimo Pessoal' },
  { value: 'consignado', label: 'Empréstimo Consignado' },
  { value: 'student_loan', label: 'Empréstimo Estudantil' },
  { value: 'mortgage', label: 'Hipoteca / Financiamento Imob.' },
  { value: 'car_loan', label: 'Financiamento de Veículo' },
  { value: 'other', label: 'Outra Dívida' },
];

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
      debt: Omit<Debt, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived' | 'linked_income_transaction_id'> & { id?: string },
      createIncome: boolean,
      creditedAccountId?: string,
      rateAnalysis?: DebtRateAnalysis | null,
      viabilityAnalysis?: DebtViabilityAnalysis | null
  ) => void;
  onAnalyzeRate: (debt: Partial<Debt>) => Promise<DebtRateAnalysis | null>;
  onAnalyzeViability: (debt: Partial<Debt>) => Promise<DebtViabilityAnalysis | null>;
  existingDebt?: Debt | null;
  accounts: Account[];
  isAIFeatureEnabled: boolean;
}

// Debounce hook
function useDebounce(value: any, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// Interest Rate Calculation
function calculateMonthlyRate(loanAmount: number, monthlyPayment: number, numberOfMonths: number): number {
    if (loanAmount <= 0 || monthlyPayment <= 0 || numberOfMonths <= 0 || (monthlyPayment * numberOfMonths <= loanAmount)) {
        return 0;
    }

    let high = 1.0; // Max monthly rate 100%
    let low = 0.0;
    let mid;
    const precision = 1e-6;

    for (let i = 0; i < 100; i++) { // Max iterations to prevent infinite loops
        mid = (high + low) / 2;
        if (mid < precision) break;

        try {
            const pv = monthlyPayment * (1 - Math.pow(1 + mid, -numberOfMonths)) / mid;
            if (pv > loanAmount) {
                low = mid;
            } else {
                high = mid;
            }
            if (Math.abs(pv - loanAmount) < precision) break;
        } catch (e) {
            console.error("Error in rate calculation", e);
            return 0; // Return 0 on math error (e.g., overflow)
        }
    }
    return mid;
}


const DebtFormModal: React.FC<DebtFormModalProps> = ({ 
    isOpen, onClose, onSave, onAnalyzeRate, onAnalyzeViability, existingDebt, accounts, isAIFeatureEnabled 
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('other');
  const [initialBalance, setInitialBalance] = useState('');
  const [debtDate, setDebtDate] = useState(getISODateString());
  const [interestRateAnnual, setInterestRateAnnual] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [numberOfInstallments, setNumberOfInstallments] = useState('');
  const [dueDateDayOfMonth, setDueDateDayOfMonth] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [createIncome, setCreateIncome] = useState(false);
  const [creditedAccountId, setCreditedAccountId] = useState('');
  
  // Analysis State
  const [rateAnalysis, setRateAnalysis] = useState<DebtRateAnalysis | null>(null);
  const [viabilityAnalysis, setViabilityAnalysis] = useState<DebtViabilityAnalysis | null>(null);
  const [isAnalyzingRate, setIsAnalyzingRate] = useState(false);
  const [isAnalyzingViability, setIsAnalyzingViability] = useState(false);

  const formStateForDebounce = { initialBalance, minimumPayment, numberOfInstallments };
  const debouncedFormState = useDebounce(formStateForDebounce, 800);

  useEffect(() => {
    if (isOpen) {
      if (existingDebt) {
        setName(existingDebt.name);
        setType(existingDebt.type);
        setInitialBalance(existingDebt.initial_balance.toString());
        setDebtDate(existingDebt.debt_date || getISODateString());
        setInterestRateAnnual(existingDebt.interest_rate_annual.toString());
        setMinimumPayment(existingDebt.minimum_payment.toString());
        setDueDateDayOfMonth(existingDebt.due_date_day_of_month?.toString() || '');
        setCreateIncome(!!existingDebt.linked_income_transaction_id); 
      } else {
        setName(''); setType('other'); setInitialBalance(''); setDebtDate(getISODateString());
        setInterestRateAnnual(''); setMinimumPayment(''); setNumberOfInstallments(''); setDueDateDayOfMonth('');
        setCreateIncome(false);
      }
      setCreditedAccountId(accounts.length > 0 ? accounts[0].id : '');
      setErrors({});
      setRateAnalysis(null);
      setViabilityAnalysis(null);
      setIsAnalyzingRate(false);
      setIsAnalyzingViability(false);
    }
  }, [existingDebt, isOpen, accounts]);

  // Automatic Interest Rate Calculation Effect
  const handleAutoCalculation = useCallback(() => {
    const bal = parseFloat(debouncedFormState.initialBalance);
    const pay = parseFloat(debouncedFormState.minimumPayment);
    const numInstallments = parseInt(debouncedFormState.numberOfInstallments, 10);

    if (bal > 0 && pay > 0 && numInstallments > 0) {
        const monthlyRate = calculateMonthlyRate(bal, pay, numInstallments);
        if (monthlyRate > 0) {
            const annualRate = (Math.pow(1 + monthlyRate, 12) - 1) * 100;
            setInterestRateAnnual(annualRate.toFixed(2));
        } else {
            setInterestRateAnnual('0.00');
        }
    }
  }, [debouncedFormState]);

  useEffect(() => {
    handleAutoCalculation();
  }, [debouncedFormState, handleAutoCalculation]);
  
  
  const handleAnalyzeRateClick = async () => {
    const debtDataForAnalysis: Partial<Debt> = { 
        interest_rate_annual: parseFloat(interestRateAnnual),
        type: type 
    };
    if (isNaN(debtDataForAnalysis.interest_rate_annual as any)) {
        setErrors({ form: 'Taxa de juros deve ser calculada primeiro (preencha Saldo, Parcela e Nº Parcelas).' });
        return;
    }
    setErrors({});
    setIsAnalyzingRate(true);
    setRateAnalysis(null);
    const result = await onAnalyzeRate(debtDataForAnalysis);
    setRateAnalysis(result);
    setIsAnalyzingRate(false);
  };

   const handleAnalyzeViabilityClick = async () => {
    const debtDataForAnalysis: Partial<Debt> = {
        name: name.trim(),
        initial_balance: parseFloat(initialBalance),
        interest_rate_annual: parseFloat(interestRateAnnual),
        minimum_payment: parseFloat(minimumPayment),
        type: type
    };

    if (!debtDataForAnalysis.initial_balance || isNaN(debtDataForAnalysis.interest_rate_annual as any) || !debtDataForAnalysis.minimum_payment) {
        setErrors({ form: 'Preencha Saldo, Parcela e Nº de Parcelas para análise de viabilidade.' });
        return;
    }
    setErrors({});
    setIsAnalyzingViability(true);
    setViabilityAnalysis(null);
    const result = await onAnalyzeViability(debtDataForAnalysis);
    setViabilityAnalysis(result);
    setIsAnalyzingViability(false);
  };


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome da dívida é obrigatório.';
    if (!debtDate) newErrors.debtDate = 'Data da dívida é obrigatória.';
    
    const numInitialBalance = parseFloat(initialBalance);
    if (isNaN(numInitialBalance) || numInitialBalance <= 0) newErrors.initialBalance = 'Saldo devedor deve ser positivo.';
    
    const numInterestRate = parseFloat(interestRateAnnual);
    if (isNaN(numInterestRate) || numInterestRate < 0) newErrors.interestRateAnnual = 'Taxa de juros inválida. Verifique os valores de cálculo.';
    
    const numMinimumPayment = parseFloat(minimumPayment);
    if (isNaN(numMinimumPayment) || numMinimumPayment <= 0) newErrors.minimumPayment = 'Valor da parcela deve ser positivo.';
    
    const numInstallments = parseInt(numberOfInstallments, 10);
    if(isNaN(numInstallments) || numInstallments <= 0) newErrors.numberOfInstallments = "Nº de parcelas deve ser positivo.";

    if (dueDateDayOfMonth) {
      const numDueDateDay = parseInt(dueDateDayOfMonth, 10);
      if (isNaN(numDueDateDay) || numDueDateDay < 1 || numDueDateDay > 31) {
        newErrors.dueDateDayOfMonth = 'Dia de vencimento deve ser entre 1 e 31.';
      }
    }
    if (createIncome && !creditedAccountId) {
        newErrors.creditedAccountId = 'É necessário selecionar uma conta para registrar a entrada.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const debtData: Omit<Debt, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived' | 'linked_income_transaction_id'> = {
      name: name.trim(), type,
      initial_balance: parseFloat(initialBalance),
      debt_date: debtDate,
      interest_rate_annual: parseFloat(interestRateAnnual),
      minimum_payment: parseFloat(minimumPayment),
      due_date_day_of_month: dueDateDayOfMonth ? parseInt(dueDateDayOfMonth, 10) : undefined,
    };
    
    const finalData = existingDebt ? { ...debtData, id: existingDebt.id } : debtData;
    onSave(finalData, createIncome, creditedAccountId, rateAnalysis, viabilityAnalysis);
    onClose();
  };
  
  const getRiskBadge = () => {
    if (!viabilityAnalysis) return null;
    const { riskBadge } = viabilityAnalysis;
    let icon;
    let text;
    let colorClass;

    switch (riskBadge) {
      case 'healthy':
        icon = <ShieldCheckIcon className="w-5 h-5" />;
        text = 'Saudável';
        colorClass = 'text-secondary dark:text-secondaryDark';
        break;
      case 'alert':
        icon = <ExclamationTriangleIcon className="w-5 h-5" />;
        text = 'Alerta';
        colorClass = 'text-amber-500 dark:text-amber-400';
        break;
      case 'critical':
        icon = <ShieldExclamationIcon className="w-5 h-5" />;
        text = 'Crítico';
        colorClass = 'text-destructive dark:text-destructiveDark';
        break;
      default:
        return null;
    }
    return <div className={`flex items-center space-x-1.5 font-semibold ${colorClass}`}>{icon}<span>{text}</span></div>;
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingDebt ? 'Editar Dívida' : 'Nova Dívida'} size="2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div className="space-y-4 col-span-1">
            <Input
            label="Nome da Dívida / Empréstimo Recebido"
            id="debtName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="Ex: Empréstimo com Fulano, Cartão XP"
            required
            />
            <Select
            label="Tipo de Dívida"
            id="debtType"
            options={debtTypeOptions}
            value={type}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.target.value as DebtType)}
            required
            />
             <Input
                label="Data da Dívida"
                id="debtDate" type="date"
                value={debtDate} onChange={(e) => setDebtDate(e.target.value)}
                error={errors.debtDate} required
            />
            <Input
                label="Dia de Vencimento Mensal (Opcional)"
                id="dueDateDayOfMonth"
                type="number" min="1" max="31"
                value={dueDateDayOfMonth} onChange={(e) => setDueDateDayOfMonth(e.target.value)}
                error={errors.dueDateDayOfMonth} placeholder="Ex: 15"
            />
             <div className="p-3 border-t border-b border-borderBase dark:border-borderBaseDark space-y-4 my-2">
                <p className="text-sm font-medium text-textMuted dark:text-textMutedDark -mt-1">Cálculo de Juros</p>
                <div className="space-y-1">
                    <Input
                        label="Saldo Devedor Inicial (R$)"
                        id="initialBalance"
                        type="number" step="0.01"
                        value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)}
                        error={errors.initialBalance} required
                    />
                    <p className="text-xs text-textMuted dark:text-textMutedDark">
                        Valor total do empréstimo ou da dívida no início.
                    </p>
                </div>
                <Input
                    label="Valor da Parcela (R$)"
                    id="minimumPayment"
                    type="number" step="0.01"
                    value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)}
                    error={errors.minimumPayment} required
                    placeholder="Ex: 350.50"
                />
                <Input
                    label="Nº de Parcelas"
                    id="numberOfInstallments"
                    type="number"
                    min="1"
                    value={numberOfInstallments}
                    onChange={(e) => setNumberOfInstallments(e.target.value)}
                    error={errors.numberOfInstallments}
                    placeholder="Ex: 24"
                    required
                />
             </div>

            {!existingDebt && (
                <div className="pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={createIncome} onChange={(e) => setCreateIncome(e.target.checked)}
                        className="rounded text-primary dark:text-primaryDark focus:ring-primary dark:focus:ring-primaryDark bg-surface dark:bg-surfaceDark border-borderBase dark:border-borderBaseDark"
                    />
                    <span className="text-sm text-textMuted dark:text-textMutedDark">
                        Registrar entrada do valor do empréstimo em uma conta?
                    </span>
                    </label>
                    {createIncome && (
                    <Select
                        containerClassName="mt-2"
                        label="Creditar na conta:" id="creditedAccountId"
                        options={accounts.map(a => ({ value: a.id, label: a.name }))}
                        value={creditedAccountId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCreditedAccountId(e.target.value)}
                        error={errors.creditedAccountId} placeholder="Selecione uma conta" disabled={accounts.length === 0}
                    />
                    )}
                </div>
            )}
        </div>
        <div className="space-y-4 col-span-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">Análise e Projeção</h3>
            <div>
                <Input
                    label="Taxa de Juros Anual (TAE) - Calculada"
                    id="interestRateAnnual"
                    type="text"
                    value={interestRateAnnual}
                    error={errors.interestRateAnnual}
                    readOnly
                    className="bg-slate-100 dark:bg-slate-800 font-bold"
                />
                {(parseInt(numberOfInstallments || '0', 10) < 12 && parseInt(numberOfInstallments || '0', 10) > 1) && (
                    <p className="text-xs text-textMuted dark:text-textMutedDark mt-1">
                        * TAE (Taxa Anual Efetiva) é uma medida padrão para comparar diferentes opções de crédito, mesmo para prazos curtos.
                    </p>
                )}
            </div>
            {isAIFeatureEnabled && (
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handleAnalyzeRateClick} disabled={isAnalyzingRate || !interestRateAnnual} className="w-full">
                        <LightBulbIcon className="w-4 h-4 mr-2"/>
                        {isAnalyzingRate ? 'Analisando Taxa...' : 'Analisar Taxa de Juros'}
                    </Button>
                    <InfoTooltip text="A IA compara a taxa de juros calculada com as taxas de mercado para o tipo de dívida selecionado." />
                </div>
                
                {rateAnalysis && !isAnalyzingRate && (
                    <div className="text-sm p-2 bg-background dark:bg-backgroundDark rounded animate-fadeIn">
                       <p><strong className="text-primary dark:text-primaryDark">Análise da Taxa:</strong> {rateAnalysis.text} <span className="font-semibold">({rateAnalysis.classification})</span></p>
                    </div>
                )}
                
                 <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handleAnalyzeViabilityClick} disabled={isAnalyzingViability || !interestRateAnnual} className="w-full">
                        <LightBulbIcon className="w-4 h-4 mr-2"/>
                        {isAnalyzingViability ? 'Analisando Viabilidade...' : 'Analisar Viabilidade'}
                    </Button>
                    <InfoTooltip text="A IA analisa o impacto desta dívida em sua saúde financeira geral, considerando sua renda e outros compromissos." />
                </div>
                 {viabilityAnalysis && !isAnalyzingViability && (
                    <div className="space-y-2 text-sm p-2 bg-background dark:bg-backgroundDark rounded animate-fadeIn">
                        <div className="font-semibold">{getRiskBadge()}</div>
                        <p><strong>Viabilidade:</strong> {viabilityAnalysis.viability}</p>
                        <p className="p-2 bg-primary/10 rounded-md"><strong>Recomendação:</strong> <span className="font-semibold">{viabilityAnalysis.recommendation}</span></p>
                    </div>
                )}
              </div>
            )}
             {errors.form && <p className="mt-1 text-xs text-destructive dark:text-destructiveDark/90">{errors.form}</p>}
        </div>
      </div>
       <div className="flex justify-end space-x-3 pt-4 border-t border-borderBase dark:border-borderBaseDark mt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="primary" onClick={handleSubmit}>
            {existingDebt ? 'Salvar Alterações' : 'Adicionar Dívida'}
          </Button>
        </div>
        <style>{`
            @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
            }
            .animate-fadeIn {
            animation: fadeIn 0.5s ease-in-out forwards;
            }
        `}</style>
    </Modal>
  );
};

export default DebtFormModal;