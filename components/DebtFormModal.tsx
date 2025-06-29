

import React from 'react';
import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Debt, DebtType, Account, DebtCalculationResult, DebtAnalysisResult } from '../types';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { getISODateString, formatCurrency } from '../utils/helpers';
import { calculateDebtPayoff } from '../utils/debtCalculator';
import { LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, CartesianGrid } from 'recharts';
import LightBulbIcon from './icons/LightBulbIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';


const debtTypeOptions: { value: DebtType; label: string }[] = [
  { value: 'credit_card_balance', label: 'Saldo de Cartão de Crédito' },
  { value: 'personal_loan', label: 'Empréstimo Pessoal' },
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
      analysis?: DebtAnalysisResult | null,
  ) => void;
  onAnalyzeDebt: (debt: Partial<Debt>) => Promise<DebtAnalysisResult | null>;
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


const DebtFormModal: React.FC<DebtFormModalProps> = ({ 
    isOpen, onClose, onSave, onAnalyzeDebt, existingDebt, accounts, isAIFeatureEnabled 
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('other');
  const [initialBalance, setInitialBalance] = useState('');
  const [debtDate, setDebtDate] = useState(getISODateString());
  const [interestRateAnnual, setInterestRateAnnual] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [fixedMonthlyPayment, setFixedMonthlyPayment] = useState('');
  const [dueDateDayOfMonth, setDueDateDayOfMonth] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [createIncome, setCreateIncome] = useState(false);
  const [creditedAccountId, setCreditedAccountId] = useState('');
  
  // Analysis & Calculation State
  const [calculation, setCalculation] = useState<DebtCalculationResult | null>(null);
  const [analysis, setAnalysis] = useState<DebtAnalysisResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const formStateForDebounce = { initialBalance, interestRateAnnual, minimumPayment, fixedMonthlyPayment };
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
        setFixedMonthlyPayment('');
        setDueDateDayOfMonth(existingDebt.due_date_day_of_month?.toString() || '');
        setCreateIncome(!!existingDebt.linked_income_transaction_id); 
      } else {
        // Reset form for new debt
        setName(''); setType('other'); setInitialBalance(''); setDebtDate(getISODateString());
        setInterestRateAnnual(''); setMinimumPayment(''); setFixedMonthlyPayment(''); setDueDateDayOfMonth('');
        setCreateIncome(false);
      }
      setCreditedAccountId(accounts.length > 0 ? accounts[0].id : '');
      setErrors({});
      setCalculation(null);
      setAnalysis(null);
      setIsCalculating(false);
      setIsAnalyzing(false);
    }
  }, [existingDebt, isOpen, accounts]);

  const handleAutoCalculation = useCallback(() => {
    const bal = parseFloat(debouncedFormState.initialBalance);
    const rate = parseFloat(debouncedFormState.interestRateAnnual);
    const minPay = parseFloat(debouncedFormState.minimumPayment);
    const fixedPay = parseFloat(debouncedFormState.fixedMonthlyPayment);

    if (bal > 0 && rate >= 0 && (minPay > 0 || fixedPay > 0)) {
        setIsCalculating(true);
        const effectivePayment = fixedPay > minPay ? fixedPay : minPay;
        const extraPayment = effectivePayment - minPay;
        
        // This is a simplified simulation for the modal, so we create a temporary Debt object
        const tempDebt: Debt = {
            id: 'temp', user_id: '', profile_id: '', created_at: '', updated_at: '',
            name: 'temp', type: 'other', initial_balance: bal, current_balance: bal,
            interest_rate_annual: rate, minimum_payment: minPay, debt_date: getISODateString(), is_archived: false
        };

        try {
            const result = calculateDebtPayoff([tempDebt], extraPayment, 'avalanche');
            if (result.monthsToPayoff > 0) {
                setCalculation({
                    monthsToPayoff: result.monthsToPayoff,
                    totalInterestPaid: result.totalInterestPaid,
                    monthlyPaymentsLog: result.payoffDetails[0].monthlyPayments.map(p => ({ month: p.month, remainingBalance: p.remainingBalance }))
                });
            } else {
                 setCalculation(null); // Could not calculate
            }
        } catch (e) {
            console.error("Error during debt calculation:", e);
            setCalculation(null);
        } finally {
            setIsCalculating(false);
        }
    } else {
        setCalculation(null);
    }
  }, [debouncedFormState]);

  useEffect(() => {
    handleAutoCalculation();
  }, [debouncedFormState, handleAutoCalculation]);
  
  
  const handleAnalyzeClick = async () => {
    const debtDataForAnalysis: Partial<Debt> = {
        name: name.trim(),
        initial_balance: parseFloat(initialBalance),
        interest_rate_annual: parseFloat(interestRateAnnual),
        minimum_payment: parseFloat(minimumPayment),
    };

    if (!debtDataForAnalysis.initial_balance || !debtDataForAnalysis.interest_rate_annual || !debtDataForAnalysis.minimum_payment) {
        setErrors({ form: 'Preencha Saldo, Juros e Pagamento Mínimo para análise.' });
        return;
    }
    setErrors({});
    setIsAnalyzing(true);
    setAnalysis(null);
    const result = await onAnalyzeDebt(debtDataForAnalysis);
    setAnalysis(result);
    setIsAnalyzing(false);
  };


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome da dívida é obrigatório.';
    if (!debtDate) newErrors.debtDate = 'Data da dívida é obrigatória.';
    
    const numInitialBalance = parseFloat(initialBalance);
    if (isNaN(numInitialBalance) || numInitialBalance <= 0) newErrors.initialBalance = 'Saldo inicial deve ser positivo.';
    
    const numInterestRate = parseFloat(interestRateAnnual);
    if (isNaN(numInterestRate) || numInterestRate < 0) newErrors.interestRateAnnual = 'Taxa de juros deve ser um número não negativo.';
    
    const numMinimumPayment = parseFloat(minimumPayment);
    if (isNaN(numMinimumPayment) || numMinimumPayment <= 0) newErrors.minimumPayment = 'Pagamento mínimo deve ser positivo.';

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
    onSave(finalData, createIncome, creditedAccountId, analysis);
    onClose();
  };
  
  const getRiskBadge = () => {
    if (!analysis) return null;
    const { riskBadge } = analysis;
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
    <Modal isOpen={isOpen} onClose={onClose} title={existingDebt ? 'Editar Dívida' : 'Nova Dívida'} size="lg">
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
                label="Saldo Devedor Inicial (R$)"
                id="initialBalance"
                type="number" step="0.01"
                value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)}
                error={errors.initialBalance} required
            />
            <Input
                label="Data da Dívida"
                id="debtDate" type="date"
                value={debtDate} onChange={(e) => setDebtDate(e.target.value)}
                error={errors.debtDate} required
            />
            <Input
                label="Taxa de Juros Anual (%)"
                id="interestRateAnnual"
                type="number" step="0.01"
                value={interestRateAnnual} onChange={(e) => setInterestRateAnnual(e.target.value)}
                error={errors.interestRateAnnual} placeholder="Ex: 19.9 para 19.9%" required
            />
            <Input
                label="Pagamento Mínimo Mensal (R$)"
                id="minimumPayment"
                type="number" step="0.01"
                value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)}
                error={errors.minimumPayment} required
            />
            <Input
                label="Pagamento Fixo Mensal (Opcional)"
                id="fixedMonthlyPayment"
                type="number" step="0.01"
                value={fixedMonthlyPayment} onChange={(e) => setFixedMonthlyPayment(e.target.value)}
                error={errors.fixedMonthlyPayment} placeholder="Ex: 500.00"
                containerClassName="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md"
            />
            <Input
                label="Dia de Vencimento Mensal (Opcional)"
                id="dueDateDayOfMonth"
                type="number" min="1" max="31"
                value={dueDateDayOfMonth} onChange={(e) => setDueDateDayOfMonth(e.target.value)}
                error={errors.dueDateDayOfMonth} placeholder="Ex: 15"
            />

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
            {isCalculating && <p className="text-sm text-textMuted dark:text-textMutedDark">Calculando projeção...</p>}
            {calculation && !isCalculating && (
                <div className="space-y-2 text-sm p-2 bg-background dark:bg-backgroundDark rounded">
                   <p><strong>Tempo Estimado:</strong> {(calculation.monthsToPayoff / 12).toFixed(1)} anos ({calculation.monthsToPayoff} meses)</p>
                   <p><strong>Total de Juros Pagos:</strong> {formatCurrency(calculation.totalInterestPaid)}</p>
                   <div style={{width: '100%', height: 150}}>
                        <ResponsiveContainer>
                            <LineChart data={calculation.monthlyPaymentsLog} margin={{top:5, right:10, left:-25, bottom:5}}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                                <XAxis dataKey="month" tick={{fontSize:10}} />
                                <YAxis tick={{fontSize:10}} tickFormatter={(val) => formatCurrency(val, 'BRL', 'pt-BR', true)} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Line type="monotone" dataKey="remainingBalance" name="Saldo Devedor" stroke="#ef4444" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                   </div>
                </div>
            )}
            
            {isAIFeatureEnabled && (
                <Button variant="secondary" size="sm" onClick={handleAnalyzeClick} disabled={isAnalyzing} className="w-full">
                    <LightBulbIcon className="w-4 h-4 mr-2"/>
                    {isAnalyzing ? 'Analisando com IA...' : 'Analisar com IA'}
                </Button>
            )}
            {isAnalyzing && <p className="text-sm text-textMuted dark:text-textMutedDark">Analisando com IA...</p>}
             {analysis && !isAnalyzing && (
                <div className="space-y-3 text-sm p-3 bg-background dark:bg-backgroundDark rounded">
                    <div className="font-semibold">{getRiskBadge()}</div>
                    <p><strong>Taxa de Juros:</strong> {analysis.interestRateClassification.text} <span className="font-semibold">({analysis.interestRateClassification.classification})</span></p>
                    <p><strong>Viabilidade (IA):</strong> {analysis.viability}</p>
                    <p><strong>Risco (IA):</strong> {analysis.risk}</p>
                    <p className="p-2 bg-primary/10 rounded-md"><strong>Recomendação da IA:</strong> <span className="font-semibold">{analysis.recommendation}</span></p>
                    <p className="text-xs text-textMuted dark:text-textMutedDark pt-2 border-t border-borderBase/50 dark:border-borderBaseDark/50">
                        *Análise da IA. Suas informações são usadas apenas para esta análise e não são compartilhadas.
                    </p>
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
    </Modal>
  );
};

export default DebtFormModal;