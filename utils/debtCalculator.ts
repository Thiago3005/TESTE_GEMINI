

import { Debt, DebtStrategy, DebtProjection, DebtPayoffDetail } from '../types';

interface DebtWorkingCopy extends Debt {
  workingBalance: number;
  interestPaidThisDebt: number;
  monthsToPayoffThisDebt: number;
  monthlyPaymentsLog: { month: number; payment: number; interest: number; principal: number; remainingBalance: number }[];
}

export const calculateDebtPayoff = (
  initialDebts: Debt[],
  extraMonthlyPayment: number,
  strategy: DebtStrategy
): DebtProjection => {
  let allDebts: DebtWorkingCopy[] = JSON.parse(JSON.stringify(initialDebts)) // Deep copy
    .filter((d: Debt) => d.current_balance > 0 && !d.is_archived)
    .map((d: Debt) => ({
      ...d,
      workingBalance: d.current_balance,
      interestPaidThisDebt: 0,
      monthsToPayoffThisDebt: 0,
      monthlyPaymentsLog: [],
    }));

  let monthsPassed = 0;
  let totalInterestPaidOverall = 0;
  const maxMonths = 720; // 60 years, to prevent infinite loops for very large debts / small payments
  const monthlyTotalBalanceLog: { month: number; totalBalance: number }[] = [];
  const payoffDetails: DebtPayoffDetail[] = [];
  
  // Log initial state at month 0
  monthlyTotalBalanceLog.push({ month: 0, totalBalance: allDebts.reduce((sum, d) => sum + d.workingBalance, 0) });

  while (allDebts.some(d => d.workingBalance > 0) && monthsPassed < maxMonths) {
    monthsPassed++;
    let monthExtraPaymentPool = extraMonthlyPayment;
    let activeDebtsInMonth = allDebts.filter(d => d.workingBalance > 0);

    // 1. Accrue interest for all active debts
    for (const debt of activeDebtsInMonth) {
      const monthlyInterestRate = debt.interest_rate_annual / 100 / 12;
      const interestThisMonth = debt.workingBalance * monthlyInterestRate;
      debt.workingBalance += interestThisMonth;
      debt.interestPaidThisDebt += interestThisMonth;
      totalInterestPaidOverall += interestThisMonth;
    }

    // 2. Apply minimum payments and build up extra payment pool from paid-off minimums
    for (const debt of activeDebtsInMonth) {
      const paymentAmount = Math.min(debt.workingBalance, debt.minimum_payment);
      const interestPart = Math.min(debt.workingBalance * (debt.interest_rate_annual / 100 / 12), paymentAmount); // Interest cannot exceed payment
      const principalPart = paymentAmount - interestPart;

      debt.workingBalance -= paymentAmount;
      
      debt.monthlyPaymentsLog.push({
          month: monthsPassed,
          payment: paymentAmount,
          interest: interestPart,
          principal: principalPart,
          remainingBalance: debt.workingBalance
      });
      
      if (debt.workingBalance <= 0) {
        monthExtraPaymentPool += debt.minimum_payment; // Snowball effect for minimums
      }
    }
    
    // 3. Apply extra payments based on strategy
    let debtsToApplyExtra = allDebts.filter(d => d.workingBalance > 0);

    if (monthExtraPaymentPool > 0 && debtsToApplyExtra.length > 0) {
        if (strategy === 'snowball') {
            debtsToApplyExtra.sort((a, b) => a.workingBalance - b.workingBalance);
        } else if (strategy === 'avalanche') {
            debtsToApplyExtra.sort((a, b) => b.interest_rate_annual - a.interest_rate_annual);
        }
        else if (strategy === 'minimums' && debtsToApplyExtra.length > 0) {
            debtsToApplyExtra.sort((a, b) => a.workingBalance - b.workingBalance);
        }

        for (const targetDebt of debtsToApplyExtra) {
            if (monthExtraPaymentPool <= 0) break;

            const extraPaymentApplied = Math.min(targetDebt.workingBalance, monthExtraPaymentPool);
            targetDebt.workingBalance -= extraPaymentApplied;
            monthExtraPaymentPool -= extraPaymentApplied;

            const existingLogEntryIndex = targetDebt.monthlyPaymentsLog.findIndex(log => log.month === monthsPassed);
            if(existingLogEntryIndex > -1) {
                targetDebt.monthlyPaymentsLog[existingLogEntryIndex].payment += extraPaymentApplied;
                targetDebt.monthlyPaymentsLog[existingLogEntryIndex].principal += extraPaymentApplied;
                targetDebt.monthlyPaymentsLog[existingLogEntryIndex].remainingBalance = targetDebt.workingBalance;
            } else {
                 targetDebt.monthlyPaymentsLog.push({
                    month: monthsPassed,
                    payment: extraPaymentApplied,
                    interest: 0,
                    principal: extraPaymentApplied,
                    remainingBalance: targetDebt.workingBalance
                });
            }
            if (targetDebt.workingBalance <= 0) {
                monthExtraPaymentPool += targetDebt.minimum_payment;
            }
        }
    }
    
    // End of loop: record total balance
    const currentTotalBalance = allDebts.reduce((sum, d) => sum + d.workingBalance, 0);
    monthlyTotalBalanceLog.push({ month: monthsPassed, totalBalance: currentTotalBalance });


    // Record fully paid debts in this month
    allDebts.forEach(debt => {
        if (debt.workingBalance <= 0 && !payoffDetails.find(pd => pd.debtId === debt.id)) {
            debt.monthsToPayoffThisDebt = monthsPassed;
            payoffDetails.push({
                debtId: debt.id,
                monthsToPayoffThisDebt: debt.monthsToPayoffThisDebt,
                interestPaidThisDebt: debt.interestPaidThisDebt,
                principalPaidThisDebt: debt.initial_balance,
                monthlyPayments: debt.monthlyPaymentsLog,
            });
        }
    });
  }
  
  const finalTotalPrincipalPaid = payoffDetails.reduce((sum, pd) => sum + pd.principalPaidThisDebt, 0);

  return {
    strategy,
    monthsToPayoff: monthsPassed >= maxMonths && allDebts.some(d => d.workingBalance > 0.01) ? -1 : monthsPassed,
    totalInterestPaid: totalInterestPaidOverall,
    totalPrincipalPaid: finalTotalPrincipalPaid,
    totalPaid: totalInterestPaidOverall + finalTotalPrincipalPaid,
    payoffDetails: payoffDetails.sort((a,b) => {
        if (a.monthsToPayoffThisDebt === b.monthsToPayoffThisDebt) {
            const debtA_initial = initialDebts.find(d => d.id === a.debtId)?.initial_balance || 0;
            const debtB_initial = initialDebts.find(d => d.id === b.debtId)?.initial_balance || 0;
            return debtA_initial - debtB_initial;
        }
        return a.monthsToPayoffThisDebt - b.monthsToPayoffThisDebt;
    }),
    monthlyTotalBalanceLog,
  };
};