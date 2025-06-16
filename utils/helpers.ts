
export const generateId = (): string => {
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

export const formatCurrency = (amount: number, currency: string = 'BRL', locale: string = 'pt-BR'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const getISODateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};