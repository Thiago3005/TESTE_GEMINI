
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

export const getISODateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

// getUserDataKey is removed as it's not needed for Supabase.
// Data is now fetched with user_id filters directly from Supabase.
