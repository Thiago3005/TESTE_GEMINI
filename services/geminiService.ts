import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { Transaction, Account, Category, MoneyBox, Loan, RecurringTransaction, AIInsightType, AIInsight, TransactionType, FuturePurchase, FuturePurchaseStatus, CreditCard, BestPurchaseDayInfo, RecurringTransactionFrequency } from '../types';
import { generateId, getISODateString, formatCurrency, formatDate } from '../utils/helpers';

// --- API Key Configuration ---
const GEMINI_API_KEY_FROM_ENV = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

if (GEMINI_API_KEY_FROM_ENV) {
  try {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY_FROM_ENV });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    ai = null;
  }
} else {
  console.warn("Gemini API Key (VITE_GEMINI_API_KEY) is not set. AI Coach features will be disabled.");
}

export const isGeminiApiKeyAvailable = (): boolean => {
  return !!GEMINI_API_KEY_FROM_ENV && !!ai;
};

// --- Data Structures for Prompts ---

export interface FinancialContext {
  currentDate: string;
  accounts: Pick<Account, 'name' | 'id'>[];
  accountBalances: { accountId: string, balance: number }[];
  categories: Pick<Category, 'id' | 'name' | 'type' | 'monthly_budget'>[];
  recentTransactions?: Transaction[]; 
  moneyBoxes?: Pick<MoneyBox, 'id' | 'name' | 'goal_amount'>[];
  moneyBoxBalances?: { moneyBoxId: string, balance: number }[];
  loans?: Pick<Loan, 'id' | 'person_name' | 'total_amount_to_reimburse'>[]; 
  outstandingLoanBalances?: { loanId: string, outstanding: number }[];
  recurringTransactions?: Pick<RecurringTransaction, 'id' | 'description' | 'amount' | 'type' | 'next_due_date'>[];
  futurePurchases?: Pick<FuturePurchase, 'id' | 'name' | 'estimated_cost' | 'priority' | 'status'>[];
  theme?: 'light' | 'dark';
  monthlyIncome?: number | null; 
}

// --- Helper to construct prompts ---
const constructPromptForGeneralAdvice = (context: FinancialContext): string => {
  let prompt = `Você é um assistente financeiro amigável e prestativo para um aplicativo de finanças pessoais.
Data Atual: ${context.currentDate}.
Renda Mensal Informada: ${context.monthlyIncome ? `${formatCurrency(context.monthlyIncome)} BRL` : 'Não informada'}.

Resumo Financeiro do Usuário:
Contas:
${context.accounts.map(acc => {
  const balanceInfo = context.accountBalances.find(b => b.accountId === acc.id);
  return `- ${acc.name}: Saldo ${balanceInfo ? formatCurrency(balanceInfo.balance) : 'N/A'}`;
}).join('\n')}

Caixinhas de Dinheiro (Metas):
${context.moneyBoxes && context.moneyBoxes.length > 0 ? context.moneyBoxes.map(mb => {
  const balanceInfo = context.moneyBoxBalances?.find(b => b.moneyBoxId === mb.id);
  return `- ${mb.name}: ${balanceInfo ? formatCurrency(balanceInfo.balance) : formatCurrency(0)} ${mb.goal_amount ? `(Meta: ${formatCurrency(mb.goal_amount)})` : ''}`;
}).join('\n') : 'Nenhuma caixinha configurada.'}

Orçamentos (Despesas):
${context.categories.filter(c => c.type === 'EXPENSE' && c.monthly_budget).map(c => `- ${c.name}: Orçamento ${formatCurrency(c.monthly_budget || 0)}`).join('\n') || 'Nenhum orçamento de despesa configurado.'}

Compras Futuras Planejadas:
${context.futurePurchases && context.futurePurchases.length > 0 ? context.futurePurchases.map(fp => `- ${fp.name} (Custo: ${formatCurrency(fp.estimated_cost)}, Prioridade: ${fp.priority}, Status: ${fp.status})`).join('\n') : 'Nenhuma compra futura planejada.'}


Com base neste resumo, forneça uma dica financeira principal, observação ou sugestão para o usuário hoje.
Seja conciso (1-2 frases), prático e encorajador. Não faça perguntas. Não use markdown.
Exemplos de tom: "Lembre-se de verificar seus gastos com Lazer este mês!" ou "Você está indo bem em sua meta de Viagem!".
Dica:`;
  return prompt;
};

const constructPromptForTransactionComment = (transaction: Transaction, context: FinancialContext, categoryName?: string, accountName?: string): string => {
  const accBalanceInfo = context.accountBalances.find(b => b.accountId === transaction.account_id);
  const accountBalance = accBalanceInfo ? formatCurrency(accBalanceInfo.balance) : 'N/A';

  let prompt = `Você é um assistente financeiro. O usuário acabou de registrar uma ${transaction.type === 'INCOME' ? 'receita' : transaction.type === 'EXPENSE' ? 'despesa' : 'transferência'}.
Detalhes: Valor ${formatCurrency(transaction.amount)} ${transaction.description ? `descrita como "${transaction.description}"` : ''} na conta "${accountName || 'N/A'}".
${categoryName ? `Categoria: "${categoryName}".` : ''}
Saldo atual da conta "${accountName || 'N/A'}": ${accountBalance}.
`;

  if (transaction.type === 'EXPENSE' && categoryName) {
    const cat = context.categories.find(c => c.name === categoryName && c.type === 'EXPENSE');
    if (cat?.monthly_budget) {
      prompt += `Orçamento para "${categoryName}": ${formatCurrency(cat.monthly_budget)}. `;
    }
  }
  
  const relevantMoneyBox = context.moneyBoxes && context.moneyBoxes.find(mb => 
    (transaction.description && mb.name.toLowerCase().includes(transaction.description.toLowerCase().substring(0,5))) ||
    (categoryName && mb.name.toLowerCase().includes(categoryName.toLowerCase().substring(0,5)))
  );

  if (relevantMoneyBox) {
    const mbBalanceInfo = context.moneyBoxBalances?.find(b => b.moneyBoxId === relevantMoneyBox.id);
    prompt += `Lembre-se da sua caixinha "${relevantMoneyBox.name}" (Saldo: ${mbBalanceInfo ? formatCurrency(mbBalanceInfo.balance) : formatCurrency(0)}${relevantMoneyBox.goal_amount ? `, Meta: ${formatCurrency(relevantMoneyBox.goal_amount)}` : ''}). `;
  }

  prompt += `Forneça um breve comentário ou sugestão (máx 1 frase). Não use markdown. Não faça perguntas.
Exemplo: "Ótimo! Continue assim." ou "Fique de olho nos gastos com Comida." ou "Considere guardar uma parte na sua caixinha Viagem."
Comentário:`;
  return prompt;
};

const constructPromptForBudgetSuggestion = (
    categoryName: string, 
    monthlyIncome: number, 
    existingBudgets: {name: string, budget?: number}[],
    context: FinancialContext
): string => {
    let prompt = `Você é um assistente financeiro. O usuário tem uma renda mensal de ${formatCurrency(monthlyIncome)}.
Ele está pedindo uma sugestão de orçamento para a categoria de despesa: "${categoryName}".

Orçamentos de despesa já definidos pelo usuário:
${existingBudgets.length > 0 ? existingBudgets.map(b => `- ${b.name}: ${formatCurrency(b.budget || 0)}`).join('\n') : 'Nenhum outro orçamento definido.'}

Contexto financeiro adicional:
Saldo total em contas: ${formatCurrency(context.accountBalances.reduce((sum, acc) => sum + acc.balance, 0))}
Total em caixinhas (metas): ${formatCurrency(context.moneyBoxBalances?.reduce((sum, mb) => sum + mb.balance, 0) || 0)}

Baseado na renda mensal, nos orçamentos existentes e nos princípios de finanças pessoais (como a regra 50/30/20, mas de forma flexível e adaptada à realidade brasileira), sugira um valor de orçamento mensal para a categoria "${categoryName}".
Responda APENAS com um objeto JSON contendo a chave "suggestedBudget" e o valor numérico sugerido. Não adicione nenhum outro texto, explicação ou markdown.
Exemplo de resposta: {"suggestedBudget": 350}
Sugestão:`;
    return prompt;
};

const constructPromptForFuturePurchaseAnalysis = (purchase: FuturePurchase, context: FinancialContext): string => {
  const totalBalance = context.accountBalances.reduce((sum, acc) => sum + acc.balance, 0);
  const totalSavings = context.moneyBoxBalances?.reduce((sum, mb) => sum + mb.balance, 0) || 0;
  
  let prompt = `Você é um assistente financeiro. O usuário deseja comprar "${purchase.name}", que custa aproximadamente ${formatCurrency(purchase.estimated_cost)}. A prioridade é ${purchase.priority}.
Data Atual: ${context.currentDate}.
Renda Mensal: ${context.monthlyIncome ? formatCurrency(context.monthlyIncome) : 'Não informada'}.
Saldo Total em Contas: ${formatCurrency(totalBalance)}.
Total Guardado em Caixinhas/Metas: ${formatCurrency(totalSavings)}.

Orçamentos de Despesa Mensais:
${context.categories.filter(c => c.type === TransactionType.EXPENSE && c.monthly_budget).map(c => `- ${c.name}: ${formatCurrency(c.monthly_budget || 0)}`).join('\n') || 'Nenhum.'}

Outras Compras Futuras Planejadas:
${context.futurePurchases?.filter(fp => fp.id !== purchase.id).map(fp => `- ${fp.name} (Custo: ${formatCurrency(fp.estimated_cost)}, Prioridade: ${fp.priority})`).join('\n') || 'Nenhuma outra.'}

Analise a viabilidade desta compra ("${purchase.name}").
Considere se o usuário tem fundos suficientes, se a compra impactaria significativamente seus orçamentos ou outras metas.
Se a renda não for informada, baseie-se nos saldos e economias.
Forneça uma análise concisa (2-3 frases) e sugira um status. Status possíveis: ACHIEVABLE_SOON (se viável em breve ou agora), NOT_RECOMMENDED_NOW (se deve adiar), PLANNED (manter como planejado se a análise não for conclusiva ou se depender de mais economia).

Responda APENAS com um objeto JSON contendo as chaves "analysisText" (string com sua análise) e "recommendedStatus" (string com um dos status: 'ACHIEVABLE_SOON', 'NOT_RECOMMENDED_NOW', 'PLANNED').
Não adicione nenhum outro texto, explicação ou markdown.
Exemplo de resposta: {"analysisText": "Comprar ${purchase.name} parece razoável agora, considerando seus saldos. Lembre-se de ajustar seu orçamento de Lazer.", "recommendedStatus": "ACHIEVABLE_SOON"}
Análise:`;
  return prompt;
};

const constructPromptForBestPurchaseDay = (card: Pick<CreditCard, 'name' | 'closing_day' | 'due_day'>, currentDateISO: string): string => {
  return `Você é um especialista em finanças e cartões de crédito.
O usuário quer saber o melhor dia para fazer uma compra com o cartão de crédito para maximizar o período sem juros e ter o maior prazo para pagar.

Dados do Cartão de Crédito:
- Dia de Fechamento da Fatura: ${card.closing_day} (Ex: 20, significa dia 20 de cada mês)
- Dia de Vencimento da Fatura: ${card.due_day} (Ex: 05, significa dia 05 de cada mês, geralmente no mês seguinte ao fechamento)

Data Atual: ${currentDateISO} (Formato: YYYY-MM-DD)

Instruções:
1.  Identifique o próximo ciclo de fatura. O melhor dia para comprar é geralmente o dia imediatamente após o fechamento da fatura atual (se a data atual for ANTES ou NO DIA do fechamento do mês corrente) ou o dia após o fechamento da fatura do próximo mês (se a data atual for APÓS o fechamento do mês corrente).
2.  Determine a data exata (DD de MMMM de YYYY) para este "melhor dia para comprar".
3.  Determine a data exata (DD de MMMM de YYYY) em que o pagamento da fatura (contendo essa compra) seria devido.
4.  Forneça uma explicação clara e concisa (1-2 frases) do porquê esta data é vantajosa, mencionando o prazo estendido.

Responda APENAS com um objeto JSON com as seguintes chaves:
- "bestPurchaseDay": "string" (Data formatada como "DD de MMMM de YYYY", ex: "21 de Julho de 2024")
- "paymentDueDate": "string" (Data formatada como "DD de MMMM de YYYY", ex: "05 de Setembro de 2024")
- "explanation": "string" (Explicação concisa)
- "error": "string" (Opcional: preencha apenas se não puder calcular ou se os dados forem inválidos/inconsistentes)

Exemplo de Cálculo (Data Atual: 2024-07-18, Fechamento: dia 20, Vencimento: dia 05):
- A fatura atual fecha em 20 de Julho de 2024.
- O melhor dia para comprar é 21 de Julho de 2024.
- Essa compra entraria na fatura que fecha em 20 de Agosto de 2024.
- O pagamento dessa fatura seria em 05 de Setembro de 2024.

Exemplo de Cálculo (Data Atual: 2024-07-25, Fechamento: dia 20, Vencimento: dia 05):
- A fatura de Julho já fechou (em 20 de Julho).
- O próximo fechamento é 20 de Agosto.
- O melhor dia para comprar é 21 de Agosto de 2024.
- Essa compra entraria na fatura que fecha em 20 de Setembro de 2024.
- O pagamento dessa fatura seria em 05 de Outubro de 2024.`;
};


// --- API Call Functions ---

export const fetchGeneralAdvice = async (context: FinancialContext): Promise<Omit<AIInsight, 'user_id' | 'created_at' | 'updated_at'> | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    console.warn("Gemini API not available for fetchGeneralAdvice.");
    return {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "AI Coach desativado ou API Key (GEMINI_API_KEY) não configurada.",
        is_read: false,
      };
  }
  const prompt = constructPromptForGeneralAdvice(context);
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
    });
    
    const text = response.text?.trim(); 

    if (text) {
      return {
        id: generateId(),
        timestamp: new Date().toISOString(), 
        type: 'general_advice',
        content: text,
        is_read: false,
      };
    }
    return { 
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "Não foi possível obter um conselho geral no momento (resposta vazia).",
        is_read: false,
      };
  } catch (error) {
    console.error("Error fetching general advice from Gemini:", error);
    let errorMessage = "Desculpe, não consegui buscar um conselho geral no momento.";
    if (error instanceof Error) {
        errorMessage += ` Detalhe: ${error.message}`;
    }
    return {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: errorMessage,
        is_read: false,
      };
  }
};

export const fetchCommentForTransaction = async (transaction: Transaction, context: FinancialContext, categoryName?: string, accountName?: string): Promise<Omit<AIInsight, 'user_id' | 'created_at' | 'updated_at'> | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    console.warn("Gemini API not available for fetchCommentForTransaction.");
     return { 
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "AI Coach desativado ou API Key (GEMINI_API_KEY) não configurada para comentar transação.",
        related_transaction_id: transaction.id,
        is_read: false,
      };
  }
  const prompt = constructPromptForTransactionComment(transaction, context, categoryName, accountName);
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
    });
    
    const text = response.text?.trim();
    
    if (text) {
      return {
        id: generateId(),
        timestamp: new Date().toISOString(), 
        type: 'transaction_comment',
        content: text,
        related_transaction_id: transaction.id,
        is_read: false,
      };
    }
    return { 
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "Não foi possível gerar um comentário para esta transação (resposta vazia).",
        related_transaction_id: transaction.id,
        is_read: false,
      };
  } catch (error) {
    console.error("Error fetching transaction comment from Gemini:", error);
    let errorMessage = "Desculpe, não consegui gerar um comentário para esta transação.";
     if (error instanceof Error) {
        errorMessage += ` Detalhe: ${error.message}`;
    }
     return {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: errorMessage,
        related_transaction_id: transaction.id,
        is_read: false,
      };
  }
};


export const fetchBudgetSuggestion = async (
    categoryName: string,
    monthlyIncome: number,
    existingBudgets: {name: string, budget?: number}[],
    context: FinancialContext
): Promise<{ suggestedBudget: number } | Omit<AIInsight, 'user_id' | 'created_at' | 'updated_at'> | null> => {
    if (!ai || !isGeminiApiKeyAvailable()) {
        console.warn("Gemini API not available for fetchBudgetSuggestion.");
        return {
            id: generateId(),
            timestamp: new Date().toISOString(),
            type: 'error_message',
            content: "AI Coach desativado ou API Key (GEMINI_API_KEY) não configurada para sugerir orçamentos.",
            is_read: false,
        };
    }
    if (!monthlyIncome || monthlyIncome <= 0) {
         return {
            id: generateId(),
            timestamp: new Date().toISOString(),
            type: 'error_message',
            content: "Por favor, informe sua renda mensal na tela do AI Coach para receber sugestões de orçamento.",
            is_read: false,
        };
    }

    const prompt = constructPromptForBudgetSuggestion(categoryName, monthlyIncome, existingBudgets, context);
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        let jsonStr = response.text?.trim() || '';
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        
        const parsed = JSON.parse(jsonStr);

        if (parsed && typeof parsed.suggestedBudget === 'number' && parsed.suggestedBudget >= 0) { // Allow 0 budget
            return { suggestedBudget: parsed.suggestedBudget };
        }
        return { 
            id: generateId(),
            timestamp: new Date().toISOString(),
            type: 'error_message',
            content: "Não foi possível obter uma sugestão de orçamento válida no momento (resposta inválida da IA).",
            is_read: false,
        };
    } catch (error) {
        console.error("Error fetching budget suggestion from Gemini:", error);
        let errorMessage = "Desculpe, não consegui buscar uma sugestão de orçamento.";
        if (error instanceof Error) {
            errorMessage += ` Detalhe: ${error.message}`;
        }
        return {
            id: generateId(),
            timestamp: new Date().toISOString(),
            type: 'error_message',
            content: errorMessage,
            is_read: false,
        };
    }
};

export const fetchFuturePurchaseAnalysis = async (
  purchase: FuturePurchase,
  context: FinancialContext
): Promise<{ analysisText: string; recommendedStatus: FuturePurchaseStatus } | Omit<AIInsight, 'user_id' | 'created_at' | 'updated_at'> | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    return {
      id: generateId(), timestamp: new Date().toISOString(), type: 'error_message',
      content: "AI Coach desativado ou API Key não configurada para analisar compra futura.",
      related_future_purchase_id: purchase.id, is_read: false,
    };
  }

  const prompt = constructPromptForFuturePurchaseAnalysis(purchase, context);
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    let jsonStr = response.text?.trim() || '';
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    
    const parsed = JSON.parse(jsonStr);

    if (parsed && typeof parsed.analysisText === 'string' && 
        typeof parsed.recommendedStatus === 'string' &&
        ['ACHIEVABLE_SOON', 'NOT_RECOMMENDED_NOW', 'PLANNED'].includes(parsed.recommendedStatus)) {
      return { 
        analysisText: parsed.analysisText, 
        recommendedStatus: parsed.recommendedStatus as FuturePurchaseStatus 
      };
    }
    return {
        id: generateId(), timestamp: new Date().toISOString(), type: 'error_message',
        content: "Não foi possível obter uma análise válida da IA para esta compra (resposta inválida).",
        related_future_purchase_id: purchase.id, is_read: false,
    };
  } catch (error) {
    console.error("Error fetching future purchase analysis from Gemini:", error);
    let errorMessage = "Desculpe, não consegui analisar esta compra futura no momento.";
    if (error instanceof Error) errorMessage += ` Detalhe: ${error.message}`;
    return {
        id: generateId(), timestamp: new Date().toISOString(), type: 'error_message',
        content: errorMessage, related_future_purchase_id: purchase.id, is_read: false,
    };
  }
};

export const fetchBestPurchaseDayAdvice = async (
  card: Pick<CreditCard, 'name' | 'closing_day' | 'due_day'>,
  currentDateISO: string
): Promise<BestPurchaseDayInfo | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    console.warn("Gemini API not available for fetchBestPurchaseDayAdvice.");
    return { 
      bestPurchaseDay: "", 
      paymentDueDate: "", 
      explanation: "AI Coach desativado ou API Key não configurada.",
      error: "AI Coach desativado ou API Key não configurada."
    };
  }

  const prompt = constructPromptForBestPurchaseDay(card, currentDateISO);
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    let jsonStr = response.text?.trim() || '';
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; // Regex to remove markdown fences if present
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    
    const parsedResult = JSON.parse(jsonStr) as BestPurchaseDayInfo;

    if (parsedResult.error) {
        console.warn("Gemini returned an error for best purchase day:", parsedResult.error);
        return { ...parsedResult, explanation: parsedResult.error }; // Use error as explanation if present
    }
    if (parsedResult.bestPurchaseDay && parsedResult.paymentDueDate && parsedResult.explanation) {
        return parsedResult;
    }
    
    return { 
        bestPurchaseDay: "", 
        paymentDueDate: "", 
        explanation: "Não foi possível determinar o melhor dia para compra (resposta inválida da IA).",
        error: "Resposta inválida da IA."
    };

  } catch (error) {
    console.error("Error fetching best purchase day advice from Gemini:", error);
    let errorMessage = "Desculpe, não consegui determinar o melhor dia para compra no momento.";
    if (error instanceof Error) {
        errorMessage += ` Detalhe: ${error.message}`;
    }
    return { 
        bestPurchaseDay: "", 
        paymentDueDate: "", 
        explanation: errorMessage,
        error: errorMessage
    };
  }
};

export const calculateNextDueDate = (currentDueDate: string, frequency: RecurringTransactionFrequency, customIntervalDays?: number): string => {
  const date = new Date(currentDueDate + 'T00:00:00'); // Ensure local date interpretation
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'custom_days':
      date.setDate(date.getDate() + (customIntervalDays || 1));
      break;
    default:
      // Should not happen with valid frequency
      break; 
  }
  return getISODateString(date);
};