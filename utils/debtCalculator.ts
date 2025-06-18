
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
  let debts: DebtWorkingCopy[] = JSON.parse(JSON.stringify(initialDebts)) // Deep copy
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

  const payoffDetails: DebtPayoffDetail[] = [];

  while (debts.some(d => d.workingBalance > 0) && monthsPassed < maxMonths) {
    monthsPassed++;
    let monthExtraPaymentPool = extraMonthlyPayment;

    // 1. Accrue interest for all active debts
    for (const debt of debts) {
      if (debt.workingBalance <= 0) continue;
      const monthlyInterestRate = debt.interest_rate_annual / 100 / 12;
      const interestThisMonth = debt.workingBalance * monthlyInterestRate;
      debt.workingBalance += interestThisMonth;
      debt.interestPaidThisDebt += interestThisMonth;
      totalInterestPaidOverall += interestThisMonth;
    }

    // 2. Apply minimum payments and build up extra payment pool from paid-off minimums
    for (const debt of debts) {
      if (debt.workingBalance <= 0) continue;
      
      const paymentAmount = Math.min(debt.workingBalance, debt.minimum_payment);
      const interestPart = Math.min(debt.workingBalance * (debt.interest_rate_annual / 100 / 12), paymentAmount); // Interest cannot exceed payment
      const principalPart = paymentAmount - interestPart;

      debt.workingBalance -= paymentAmount;
      // totalPrincipalPaidOverall += principalPart; // Principal sum is more complex, better to calculate at end

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
    let debtsToApplyExtra = debts.filter(d => d.workingBalance > 0);

    if (monthExtraPaymentPool > 0 && debtsToApplyExtra.length > 0) {
        if (strategy === 'snowball') {
            debtsToApplyExtra.sort((a, b) => a.workingBalance - b.workingBalance);
        } else if (strategy === 'avalanche') {
            debtsToApplyExtra.sort((a, b) => b.interest_rate_annual - a.interest_rate_annual);
        }
        // For 'minimums' strategy, extra pool (from paid off minimums) will be applied to the debt with smallest balance
        // (effectively behaving like snowball for the freed-up minimums)
         else if (strategy === 'minimums' && debtsToApplyExtra.length > 0) {
            debtsToApplyExtra.sort((a, b) => a.workingBalance - b.workingBalance);
        }


        for (const targetDebt of debtsToApplyExtra) {
            if (monthExtraPaymentPool <= 0) break;
            if (targetDebt.workingBalance <= 0) continue;

            const extraPaymentApplied = Math.min(targetDebt.workingBalance, monthExtraPaymentPool);
            targetDebt.workingBalance -= extraPaymentApplied;
            monthExtraPaymentPool -= extraPaymentApplied;

            const existingLogEntryIndex = targetDebt.monthlyPaymentsLog.findIndex(log => log.month === monthsPassed);
            if(existingLogEntryIndex > -1) {
                targetDebt.monthlyPaymentsLog[existingLogEntryIndex].payment += extraPaymentApplied;
                targetDebt.monthlyPaymentsLog[existingLogEntryIndex].principal += extraPaymentApplied; // Assuming extra payment is pure principal
                targetDebt.monthlyPaymentsLog[existingLogEntryIndex].remainingBalance = targetDebt.workingBalance;
            } else {
                 targetDebt.monthlyPaymentsLog.push({
                    month: monthsPassed,
                    payment: extraPaymentApplied,
                    interest: 0, // Pure principal if it's only extra payment
                    principal: extraPaymentApplied,
                    remainingBalance: targetDebt.workingBalance
                });
            }
            if (targetDebt.workingBalance <= 0) {
                monthExtraPaymentPool += targetDebt.minimum_payment; // Add its minimum to the pool
            }
        }
    }

    // Record fully paid debts in this month
    debts.forEach(debt => {
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
    // Filter out paid debts for the next iteration's main loop
    debts = debts.filter(d => d.workingBalance > 0);
  }
  
  // Ensure all debts that were part of the plan are in payoffDetails
  initialDebts.filter(idb => idb.current_balance > 0 && !idb.is_archived).forEach(initialDebt => {
      if (!payoffDetails.find(pd => pd.debtId === initialDebt.id)) {
          const workingCopy = debts.find(d => d.id === initialDebt.id) || 
                              initialDebts.find(d => d.id === initialDebt.id) as unknown as DebtWorkingCopy; 
          payoffDetails.push({
              debtId: initialDebt.id,
              monthsToPayoffThisDebt: workingCopy?.workingBalance > 0 && monthsPassed >= maxMonths ? maxMonths : workingCopy?.monthsToPayoffThisDebt || monthsPassed,
              interestPaidThisDebt: workingCopy?.interestPaidThisDebt || 0,
              principalPaidThisDebt: initialDebt.initial_balance - (workingCopy?.workingBalance > 0 ? workingCopy.workingBalance : 0),
              monthlyPayments: workingCopy?.monthlyPaymentsLog || [],
          });
      }
  });
  
  const finalTotalPrincipalPaid = payoffDetails.reduce((sum, pd) => sum + pd.principalPaidThisDebt, 0);

  return {
    strategy,
    monthsToPayoff: monthsPassed >= maxMonths && initialDebts.filter(d => !d.is_archived).some(d => {
        const detail = payoffDetails.find(pd => pd.debtId === d.id);
        return detail ? (d.initial_balance - detail.principalPaidThisDebt) > 0.01 : d.current_balance > 0.01;
    }) ? -1 : monthsPassed,
    totalInterestPaid: totalInterestPaidOverall,
    totalPrincipalPaid: finalTotalPrincipalPaid,
    totalPaid: totalInterestPaidOverall + finalTotalPrincipalPaid,
    payoffDetails: payoffDetails.sort((a,b) => {
        if (a.monthsToPayoffThisDebt === b.monthsToPayoffThisDebt) {
            // If paid in same month, sort by smallest initial balance (Snowball tie-breaker)
            // or highest interest (Avalanche tie-breaker), or just keep stable.
            // For simplicity, let's use initial balance as a secondary sort.
            const debtA_initial = initialDebts.find(d => d.id === a.debtId)?.initial_balance || 0;
            const debtB_initial = initialDebts.find(d => d.id === b.debtId)?.initial_balance || 0;
            return debtA_initial - debtB_initial;
        }
        return a.monthsToPayoffThisDebt - b.monthsToPayoffThisDebt;
    }),
  };
};
