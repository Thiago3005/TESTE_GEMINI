export const generateId = (): string => { // Keep for client-side only IDs, e.g., toast messages
  return crypto.randomUUID();
};

export const formatDate = (dateString: string, locale: string = 'pt-BR', options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00'); // Ensure date is parsed as local or from ISO string
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  const finalOptions = options ? { ...defaultOptions, ...options } : defaultOptions;
  
  return date.toLocaleDateString(locale, finalOptions);
};

export const formatCurrency = (amount: number, currency: string = 'BRL', locale: string = 'pt-BR', isPrivacyMode: boolean = false): string => {
  if (isPrivacyMode) {
    const currencySymbol = new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).formatToParts(0).find(part => part.type === 'currency')?.value || '$';
    return `${currencySymbol} ****,**`;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const getISODateString = (dateInput: Date | string = new Date()): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput.includes('T') ? dateInput : dateInput + 'T00:00:00') : dateInput;
  return date.toISOString().split('T')[0];
};

export const daysUntil = (dateString: string): number => {
  const targetDate = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const calculateInstallmentDueDate = (purchaseDateStr: string, installmentNumber: number, cardDueDay: number): Date => {
  const purchaseDate = new Date(purchaseDateStr + 'T00:00:00'); // Work with local date
  
  // Due date is for the Nth month *after* the purchase month.
  // Example: Purchase in Jan (month 0), 1st installment due in Feb (month 1) if cardDueDay is after purchase day.
  // If purchase day is after cardDueDay, first installment might be in March.
  // For simplicity, we assume the first installment is in the month *after* purchase month, if the purchase is made *before or on* the closing day.
  // Or two months after if purchase is *after* closing day.
  // However, a simpler approach is to just add months based on installmentNumber to purchase month.
  
  let dueMonth = purchaseDate.getMonth() + installmentNumber; // installmentNumber is 1-based for 1st, 2nd etc.
  let dueYear = purchaseDate.getFullYear();

  // Adjust year if dueMonth goes beyond December
  if (dueMonth > 11) { 
    dueYear += Math.floor(dueMonth / 12);
    dueMonth = dueMonth % 12;
  }
  
  // Create the due date with the card's due day
  // Ensure we handle cases like cardDueDay=31 for months with fewer days.
  const tentativeDueDate = new Date(dueYear, dueMonth, cardDueDay);
  
  // If cardDueDay is, for example, 31, and dueMonth is February, it will roll over to March.
  // We want it to be the last day of Feb if cardDueDay > days in Feb.
  // This is complex. A more common bank practice is:
  // If purchase on Jan 10, closing day 20, due day 5.
  // 1st installment due Feb 5. (Month after purchase, on due day)
  // So, the month of the first due date is purchaseDate.getMonth() + 1.
  
  // Recalculating with a simpler approach:
  // The Nth installment is due N months after the first billing cycle that includes the purchase.
  // For simplicity, let's assume first installment is due monthAfterPurchase.dueDay
  // Nth installment is due (monthAfterPurchase + N - 1).dueDay

  const firstInstallmentMonth = purchaseDate.getMonth() + 1; // Month index
  const targetInstallmentMonth = firstInstallmentMonth + (installmentNumber - 1);
  
  dueYear = purchaseDate.getFullYear();
  dueMonth = targetInstallmentMonth;

  if (dueMonth > 11) {
      dueYear += Math.floor(dueMonth / 12);
      dueMonth = dueMonth % 12;
  }
  
  // What if purchaseDate.getDate() > cardDueDay? Some banks push to next month.
  // This logic assumes the first installment for a purchase made in Month M,
  // with due day D, will be in Month M+1 on day D.
  
  // Create a date for the calculated month and year, using day 1 to avoid month overflow issues with day 31.
  const baseDueDate = new Date(dueYear, dueMonth, 1);
  const daysInDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate(); // Days in the calculated due month
  
  // Set the day to cardDueDay, but not exceeding the actual number of days in that month.
  const finalDueDay = Math.min(cardDueDay, daysInDueMonth);
  baseDueDate.setDate(finalDueDay);
  
  return baseDueDate;
};


export const getEligibleInstallmentsForBillingCycle = (
  purchases: import('../types').InstallmentPurchase[],
  card: import('../types').CreditCard,
  currentDate: Date
): import('../types').InstallmentPurchase[] => {
  if (!purchases || !card) return [];

  const eligible: import('../types').InstallmentPurchase[] = [];
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Determine the current invoice's closing date
  let closingDateThisCycle = new Date(currentYear, currentMonth, card.closing_day);
  if (currentDate.getDate() > card.closing_day) {
    // If current date is past this month's closing day, the relevant cycle is for next month's payment
    closingDateThisCycle.setMonth(currentMonth + 1);
  }
  // Determine the payment due date for this cycle
  // Payment is usually in the month after closing. If closing is Dec, payment is Jan next year.
  let paymentDueDateThisCycle = new Date(closingDateThisCycle.getFullYear(), closingDateThisCycle.getMonth(), card.due_day);
  if (card.due_day < card.closing_day) { // Typical scenario, payment next month
    paymentDueDateThisCycle.setMonth(closingDateThisCycle.getMonth() + 1);
  }
  // Ensure the payment due date is correct if closing date was advanced to next month
  // E.g. current 25/July, close 20, due 01. Invoice closes 20/Aug, due 01/Sep.
  // If current 15/July, close 20, due 01. Invoice closes 20/July, due 01/Aug.

  for (const p of purchases) {
    if (p.installments_paid < p.number_of_installments) {
      const nextInstallmentNumber = p.installments_paid + 1;
      const installmentDueDate = calculateInstallmentDueDate(p.purchase_date, nextInstallmentNumber, card.due_day);
      
      // Check if this installment's due date falls on or before the payment date of the current/upcoming invoice
      // And after the *previous* cycle's payment due date (this part is tricky and might need refinement based on exact bank logic)
      // A simpler check: Is the installment due on or before the determined paymentDueDateThisCycle?
      // And is it not too far in the past (e.g. not before this cycle's closing date might be too restrictive)

      // Let's simplify: if an installment's calculated due date (month/year) matches the paymentDueDateThisCycle's month/year,
      // and its day is on or before, it's part of this bill.
      // This needs to be robust for "best purchase day" calculations etc.
      // The key is to identify installments that will appear on the *next statement to be paid*.

      // If installment due date is on or before the payment due date of the *invoice that just closed or is about to close*.
      if (installmentDueDate <= paymentDueDateThisCycle) {
         // Additional check: ensure it wasn't part of a *previous* bill already considered paid.
         // This means its due date should be *after* the previous cycle's payment due date.
         let previousPaymentDueDate = new Date(paymentDueDateThisCycle);
         previousPaymentDueDate.setMonth(previousPaymentDueDate.getMonth() - 1);
         if (installmentDueDate > previousPaymentDueDate) {
            eligible.push(p);
         } else if (installmentDueDate.getFullYear() === paymentDueDateThisCycle.getFullYear() && installmentDueDate.getMonth() === paymentDueDateThisCycle.getMonth()) {
            // If it's in the same month/year as payment due date, it's likely for this bill.
             eligible.push(p);
         }
      }
    }
  }
  return eligible.filter((value, index, self) => self.findIndex(t => t.id === value.id) === index); // Unique
};
