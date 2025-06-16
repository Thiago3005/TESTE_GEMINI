import { GoogleGenerativeAI } from "@google/generative-ai";
import { Transaction, Account, Category, MoneyBox, Loan, RecurringTransaction, AIInsightType, AIInsight, TransactionType, FuturePurchase, FuturePurchaseStatus } from '../types';
import { generateId, getISODateString, formatCurrency } from '../utils/helpers';

// --- API Key Configuration ---
const GEMINI_API_KEY_FROM_ENV = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY_FROM_ENV) {
  try {
    ai = new GoogleGenerativeAI(GEMINI_API_KEY_FROM_ENV);
  } catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI:", error);
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
  categories: Pick<Category, 'id' | 'name' | 'type' | 'monthlyBudget'>[];
  recentTransactions?: Transaction[]; 
  moneyBoxes?: Pick<MoneyBox, 'id' | 'name' | 'goalAmount'>[];
  moneyBoxBalances?: { moneyBoxId: string, balance: number }[];
  loans?: Pick<Loan, 'id' | 'personName' | 'totalAmountToReimburse'>[]; 
  outstandingLoanBalances?: { loanId: string, outstanding: number }[];
  recurringTransactions?: Pick<RecurringTransaction, 'id' | 'description' | 'amount' | 'type' | 'nextDueDate'>[];
  futurePurchases?: Pick<FuturePurchase, 'id' | 'name' | 'estimatedCost' | 'priority' | 'status'>[]; // Added
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
  return `- ${mb.name}: ${balanceInfo ? formatCurrency(balanceInfo.balance) : formatCurrency(0)} ${mb.goalAmount ? `(Meta: ${formatCurrency(mb.goalAmount)})` : ''}`;
}).join('\n') : 'Nenhuma caixinha configurada.'}

Orçamentos (Despesas):
${context.categories.filter(c => c.type === 'EXPENSE' && c.monthlyBudget).map(c => `- ${c.name}: Orçamento ${formatCurrency(c.monthlyBudget || 0)}`).join('\n') || 'Nenhum orçamento de despesa configurado.'}

Compras Futuras Planejadas:
${context.futurePurchases && context.futurePurchases.length > 0 ? context.futurePurchases.map(fp => `- ${fp.name} (Custo: ${formatCurrency(fp.estimatedCost)}, Prioridade: ${fp.priority}, Status: ${fp.status})`).join('\n') : 'Nenhuma compra futura planejada.'}


Com base neste resumo, forneça uma dica financeira principal, observação ou sugestão para o usuário hoje.
Seja conciso (1-2 frases), prático e encorajador. Não faça perguntas. Não use markdown.
Exemplos de tom: "Lembre-se de verificar seus gastos com Lazer este mês!" ou "Você está indo bem em sua meta de Viagem!".
Dica:`;
  return prompt;
};

const constructPromptForTransactionComment = (transaction: Transaction, context: FinancialContext, categoryName?: string, accountName?: string): string => {
  const accBalanceInfo = context.accountBalances.find(b => b.accountId === transaction.accountId);
  const accountBalance = accBalanceInfo ? formatCurrency(accBalanceInfo.balance) : 'N/A';

  let prompt = `Você é um assistente financeiro. O usuário acabou de registrar uma ${transaction.type === 'INCOME' ? 'receita' : transaction.type === 'EXPENSE' ? 'despesa' : 'transferência'}.
Detalhes: Valor ${formatCurrency(transaction.amount)} ${transaction.description ? `descrita como "${transaction.description}"` : ''} na conta "${accountName || 'N/A'}".
${categoryName ? `Categoria: "${categoryName}".` : ''}
Saldo atual da conta "${accountName || 'N/A'}": ${accountBalance}.
`;

  if (transaction.type === 'EXPENSE' && categoryName) {
    const cat = context.categories.find(c => c.name === categoryName && c.type === 'EXPENSE');
    if (cat?.monthlyBudget) {
      prompt += `Orçamento para "${categoryName}": ${formatCurrency(cat.monthlyBudget)}. `;
    }
  }
  
  const relevantMoneyBox = context.moneyBoxes && context.moneyBoxes.find(mb => 
    (transaction.description && mb.name.toLowerCase().includes(transaction.description.toLowerCase().substring(0,5))) ||
    (categoryName && mb.name.toLowerCase().includes(categoryName.toLowerCase().substring(0,5)))
  );

  if (relevantMoneyBox) {
    const mbBalanceInfo = context.moneyBoxBalances?.find(b => b.moneyBoxId === relevantMoneyBox.id);
    prompt += `Lembre-se da sua caixinha "${relevantMoneyBox.name}" (Saldo: ${mbBalanceInfo ? formatCurrency(mbBalanceInfo.balance) : formatCurrency(0)}${relevantMoneyBox.goalAmount ? `, Meta: ${formatCurrency(relevantMoneyBox.goalAmount)}` : ''}). `;
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
  
  let prompt = `Você é um assistente financeiro. O usuário deseja comprar "${purchase.name}", que custa aproximadamente ${formatCurrency(purchase.estimatedCost)}. A prioridade é ${purchase.priority}.
Data Atual: ${context.currentDate}.
Renda Mensal: ${context.monthlyIncome ? formatCurrency(context.monthlyIncome) : 'Não informada'}.
Saldo Total em Contas: ${formatCurrency(totalBalance)}.
Total Guardado em Caixinhas/Metas: ${formatCurrency(totalSavings)}.

Orçamentos de Despesa Mensais:
${context.categories.filter(c => c.type === TransactionType.EXPENSE && c.monthlyBudget).map(c => `- ${c.name}: ${formatCurrency(c.monthlyBudget || 0)}`).join('\n') || 'Nenhum.'}

Outras Compras Futuras Planejadas:
${context.futurePurchases?.filter(fp => fp.id !== purchase.id).map(fp => `- ${fp.name} (Custo: ${formatCurrency(fp.estimatedCost)}, Prioridade: ${fp.priority})`).join('\n') || 'Nenhuma outra.'}

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


// --- API Call Functions ---

export const fetchGeneralAdvice = async (context: FinancialContext): Promise<AIInsight | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    console.warn("Gemini API not available for fetchGeneralAdvice.");
    return {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "AI Coach desativado ou API Key (VITE_GEMINI_API_KEY) não configurada.",
        isRead: false,
      };
  }
  const prompt = constructPromptForGeneralAdvice(context);
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (text) {
      return {
        id: generateId(),
        timestamp: new Date().toISOString(), 
        type: 'general_advice',
        content: text,
        isRead: false,
      };
    }
    return { 
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "Não foi possível obter um conselho geral no momento (resposta vazia).",
        isRead: false,
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
        isRead: false,
      };
  }
};

export const fetchCommentForTransaction = async (transaction: Transaction, context: FinancialContext, categoryName?: string, accountName?: string): Promise<AIInsight | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    console.warn("Gemini API not available for fetchCommentForTransaction.");
     return { 
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "AI Coach desativado ou API Key (VITE_GEMINI_API_KEY) não configurada para comentar transação.",
        relatedTransactionId: transaction.id,
        isRead: false,
      };
  }
  const prompt = constructPromptForTransactionComment(transaction, context, categoryName, accountName);
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (text) {
      return {
        id: generateId(),
        timestamp: new Date().toISOString(), 
        type: 'transaction_comment',
        content: text,
        relatedTransactionId: transaction.id,
        isRead: false,
      };
    }
    return { 
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "Não foi possível gerar um comentário para esta transação (resposta vazia).",
        relatedTransactionId: transaction.id,
        isRead: false,
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
        relatedTransactionId: transaction.id,
        isRead: false,
      };
  }
};


export const fetchBudgetSuggestion = async (
    categoryName: string,
    monthlyIncome: number,
    existingBudgets: {name: string, budget?: number}[],
    context: FinancialContext
): Promise<{ suggestedBudget: number } | AIInsight | null> => {
    if (!ai || !isGeminiApiKeyAvailable()) {
        console.warn("Gemini API not available for fetchBudgetSuggestion.");
        return {
            id: generateId(),
            timestamp: new Date().toISOString(),
            type: 'error_message',
            content: "AI Coach desativado ou API Key (VITE_GEMINI_API_KEY) não configurada para sugerir orçamentos.",
            isRead: false,
        };
    }
    if (!monthlyIncome || monthlyIncome <= 0) {
         return {
            id: generateId(),
            timestamp: new Date().toISOString(),
            type: 'error_message',
            content: "Por favor, informe sua renda mensal na tela do AI Coach para receber sugestões de orçamento.",
            isRead: false,
        };
    }

    const prompt = constructPromptForBudgetSuggestion(categoryName, monthlyIncome, existingBudgets, context);
    try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        let jsonStr = text || '';
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
            isRead: false,
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
            isRead: false,
        };
    }
};

export const fetchFuturePurchaseAnalysis = async (
  purchase: FuturePurchase,
  context: FinancialContext
): Promise<{ analysisText: string; recommendedStatus: FuturePurchaseStatus } | AIInsight | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    return {
      id: generateId(), timestamp: new Date().toISOString(), type: 'error_message',
      content: "AI Coach desativado ou API Key não configurada para analisar compra futura.",
      relatedFuturePurchaseId: purchase.id, isRead: false,
    };
  }

  const prompt = constructPromptForFuturePurchaseAnalysis(purchase, context);
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let jsonStr = text || '';
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
        relatedFuturePurchaseId: purchase.id, isRead: false,
    };
  } catch (error) {
    console.error("Error fetching future purchase analysis from Gemini:", error);
    let errorMessage = "Desculpe, não consegui analisar esta compra futura no momento.";
    if (error instanceof Error) errorMessage += ` Detalhe: ${error.message}`;
    return {
        id: generateId(), timestamp: new Date().toISOString(), type: 'error_message',
        content: errorMessage, relatedFuturePurchaseId: purchase.id, isRead: false,
    };
  }
};