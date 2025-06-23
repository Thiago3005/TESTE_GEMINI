
import { GoogleGenAI, GenerateContentResponse, Chat } from "../google-genai-shim"; // Changed import
import { Transaction, Account, Category, MoneyBox, Loan, RecurringTransaction, AIInsightType, AIInsight, TransactionType, FuturePurchase, FuturePurchaseStatus, CreditCard, BestPurchaseDayInfo, RecurringTransactionFrequency, Debt, DebtStrategy, DebtProjection, SafeToSpendTodayInfo } from '../types';
import { generateId, getISODateString, formatCurrency, formatDate } from '../utils/helpers';

const GEMINI_API_KEY_FROM_ENV = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

if (GEMINI_API_KEY_FROM_ENV) {
  try {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY_FROM_ENV }); 
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    ai = null; 
  }
} else {
  console.warn("Gemini API Key (process.env.GEMINI_API_KEY) is not set. AI Coach features will be disabled.");
}

export const isGeminiApiKeyAvailable = (): boolean => {
  return !!GEMINI_API_KEY_FROM_ENV && !!ai;
};

export interface SimulatedTransactionData {
  description?: string;
  amount: number;
  type: TransactionType;
  date: string;
}
export interface FinancialContext {
  currentDate: string; 
  dayOfMonth: number; 
  daysInMonth: number; 
  accounts: Pick<Account, 'name' | 'id'>[];
  accountBalances: { accountId: string, balance: number }[];
  categories: Pick<Category, 'id' | 'name' | 'type' | 'monthly_budget'>[];
  transactions?: Transaction[]; 
  moneyBoxes?: Pick<MoneyBox, 'id' | 'name' | 'goal_amount'>[];
  moneyBoxBalances?: { moneyBoxId: string, balance: number }[];
  loans?: Pick<Loan, 'id' | 'person_name' | 'total_amount_to_reimburse'>[]; 
  outstandingLoanBalances?: { loanId: string, outstanding: number }[];
  recurringTransactions?: Pick<RecurringTransaction, 'id' | 'description' | 'amount' | 'type' | 'next_due_date' | 'frequency' | 'category_id'>[];
  futurePurchases?: Pick<FuturePurchase, 'id' | 'name' | 'estimated_cost' | 'priority' | 'status'>[];
  theme?: 'light' | 'dark';
  monthlyIncome?: number | null; 
  simulatedTransactionData?: SimulatedTransactionData; // Added for cash flow projection
  debts?: Debt[]; // Added for debt strategy/projection context
}

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

const constructPromptForSpendingAnomaly = (categoryName: string, currentSpend: number, proRataBudget: number, budget?: number, context?: FinancialContext): string => {
  return `Você é um assistente financeiro.
Categoria: "${categoryName}"
Gasto Atual no Mês: ${formatCurrency(currentSpend)}
${budget ? `Orçamento Mensal para esta Categoria: ${formatCurrency(budget)}.` : 'Orçamento não definido para esta categoria.'}
${budget && context ? `Hoje é dia ${context.dayOfMonth} de ${context.daysInMonth} do mês. Proporcionalmente, o gasto esperado até agora seria em torno de ${formatCurrency(proRataBudget)}.` : ''}

Com base no gasto atual, ele está significativamente acima do esperado para esta altura do mês ou do orçamento proporcional?
Se sim, forneça um alerta CURTO e DIRETO (1-2 frases). Ex: "Atenção: Seus gastos com ${categoryName} (${formatCurrency(currentSpend)}) já ultrapassaram o esperado para esta data (${formatCurrency(proRataBudget)})." ou "Gastos com ${categoryName} estão X% acima do esperado para hoje."
Se não houver anomalia clara, ou se o gasto estiver dentro do esperado/orçamento, responda APENAS com a palavra "NORMAL".
Não faça perguntas. Não use markdown.
Alerta:`;
};

const constructPromptForBudgetOverspendProjection = (categoryName: string, currentSpend: number, budget: number, daysRemaining: number, projectedSpend: number, context?: FinancialContext): string => {
  return `Você é um assistente financeiro.
Categoria: "${categoryName}"
Gasto Atual no Mês: ${formatCurrency(currentSpend)}
Orçamento Mensal para esta Categoria: ${formatCurrency(budget)}
${context ? `Hoje é dia ${context.dayOfMonth} de ${context.daysInMonth} do mês. Faltam ${daysRemaining} dias.` : ''}
Projeção de Gasto Total no Mês (mantendo o ritmo atual): ${formatCurrency(projectedSpend)}

Com base no ritmo atual de gastos, há uma projeção de que o orçamento para "${categoryName}" será estourado este mês?
Se sim, forneça um alerta CURTO e DIRETO (1-2 frases), mencionando o possível valor do estouro. Ex: "Alerta: Mantendo este ritmo, seus gastos com ${categoryName} podem exceder o orçamento em cerca de ${formatCurrency(projectedSpend - budget)} este mês."
Se não houver projeção clara de estouro, ou se a projeção estiver dentro do orçamento, responda APENAS com a palavra "NORMAL".
Não faça perguntas. Não use markdown.
Alerta:`;
};

const constructPromptForRecurringPaymentCandidate = (
  transactions: Transaction[], 
  existingRecurringTransactions: Pick<RecurringTransaction, 'description' | 'amount' | 'type' | 'frequency' | 'category_id'>[],
  context: FinancialContext
): string => {
  const ninetyDaysAgo = new Date(context.currentDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentTransactions = transactions.filter(t => t.date >= getISODateString(ninetyDaysAgo) && t.type === TransactionType.EXPENSE);

  return `Você é um assistente financeiro que ajuda a identificar despesas recorrentes não cadastradas.
  Analise o histórico de despesas do usuário dos últimos 90 dias (data atual: ${context.currentDate}).
  Procure por pagamentos que se repetem com valores e descrições similares em intervalos regulares (ex: mensais, semanais).
  
  Despesas Recorrentes já cadastradas (NÃO SUGIRA ESTAS):
  ${existingRecurringTransactions.length > 0 ? existingRecurringTransactions.map(rt => `- "${rt.description}" (${formatCurrency(rt.amount)}, ${rt.frequency})`).join('\n') : 'Nenhuma.'}

  Histórico de Transações de Despesa (Últimos 90 dias):
  ${recentTransactions.map(t => `- Data: ${t.date}, Descrição: "${t.description || context.categories.find(c=>c.id === t.category_id)?.name || 'Despesa'}", Valor: ${formatCurrency(t.amount)}`).slice(0, 30).join('\n')} 
  ${recentTransactions.length > 30 ? `\n... (e mais ${recentTransactions.length - 30} transações)` : ''}

  Se encontrar UMA despesa que parece ser recorrente mas NÃO ESTÁ na lista de já cadastradas, sugira registrá-la.
  Seja específico: "Notei pagamentos para '{Nome do Serviço/Descrição}' de aproximadamente {Valor} em datas como {Data1}, {Data2}. Gostaria de cadastrar como despesa recorrente?"
  Se encontrar múltiplas, sugira a mais óbvia ou mais frequente.
  Se não encontrar nenhuma candidata clara, responda APENAS com a palavra "NORMAL".
  Não use markdown. Não faça perguntas diretas no final, apenas a sugestão como no exemplo.
  Sugestão:`;
};

const constructPromptForSavingOpportunity = (
  transactions: Transaction[], 
  categories: Pick<Category, 'id' | 'name' | 'type'>[],
  moneyBoxes: Pick<MoneyBox, 'id' | 'name' | 'goal_amount'>[],
  context: FinancialContext
): string => {
  const oneMonthAgo = new Date(context.currentDate);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const monthlyExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE && t.date >= getISODateString(oneMonthAgo));

  let prompt = `Você é um coach financeiro que ajuda usuários a encontrar oportunidades de economia.
  Renda Mensal: ${context.monthlyIncome ? formatCurrency(context.monthlyIncome) : 'Não informada'}.
  Data Atual: ${context.currentDate}.

  Metas de Economia (Caixinhas):
  ${moneyBoxes.length > 0 ? moneyBoxes.map(mb => `- ${mb.name}${mb.goal_amount ? ` (Meta: ${formatCurrency(mb.goal_amount)})` : ''}`).join('\n') : 'Nenhuma meta de economia ativa.'}

  Gastos do Último Mês (Top 5 categorias por frequência, excluindo essenciais como aluguel, contas fixas de casa):
  `;
  const categorySpending: { [key: string]: { total: number, count: number, name: string } } = {};
  monthlyExpenses.forEach(t => {
    if (t.category_id) {
      const catName = categories.find(c => c.id === t.category_id)?.name || 'Outros';
      if (['Moradia', 'Aluguel', 'Condomínio', 'Impostos', 'Luz', 'Água', 'Gás', 'Internet Fixa', 'Saúde', 'Educação'].includes(catName)) return;

      if (!categorySpending[t.category_id]) {
        categorySpending[t.category_id] = { total: 0, count: 0, name: catName };
      }
      categorySpending[t.category_id].total += t.amount;
      categorySpending[t.category_id].count++;
    }
  });
  const sortedFrequentCategories = Object.values(categorySpending).sort((a,b) => b.count - a.count).slice(0,5);
  prompt += sortedFrequentCategories.map(s => `- ${s.name}: ${formatCurrency(s.total)} em ${s.count} transações`).join('\n') || 'Nenhum gasto relevante encontrado.';

  prompt += `\n\nIdentifique UMA categoria onde o usuário parece ter gastos pequenos e frequentes que, somados, são significativos (ex: cafés diários, lanches, delivery, apps de transporte).
  Sugira uma pequena mudança de hábito que poderia gerar economia. Se houver metas (Caixinhas), tente vincular a economia a uma delas.
  Seja prático e positivo. Ex: "Seus gastos com 'Delivery' somaram ${formatCurrency(150)} no último mês. Que tal reduzir para uma vez por semana e direcionar ${formatCurrency(75)} para sua meta 'Viagem'?"
  Se não houver oportunidade clara ou dados suficientes, responda APENAS com a palavra "NORMAL".
  Não use markdown. Não faça perguntas.
  Sugestão:`;
  return prompt;
};

const constructPromptForUnusualTransactionValue = (
  transaction: Transaction,
  categoryName: string,
  recentCategoryTransactions: Transaction[], 
  context: FinancialContext
): string => {
  const samples = recentCategoryTransactions
    .filter(t => t.id !== transaction.id) 
    .slice(0, 10) 
    .map(t => formatCurrency(t.amount));

  return `Você é um assistente financeiro que detecta transações de valor incomum.
  O usuário registrou uma despesa:
  - Descrição: "${transaction.description || categoryName}"
  - Categoria: "${categoryName}"
  - Valor: ${formatCurrency(transaction.amount)}
  - Data: ${transaction.date}

  Valores de despesas recentes nesta categoria ("${categoryName}"): ${samples.length > 0 ? samples.join(', ') : 'Nenhuma outra recente.'}
  
  O valor desta transação (${formatCurrency(transaction.amount)}) é significativamente mais alto que o normal para esta categoria, baseado nas amostras?
  Se sim, forneça um alerta CURTO. Ex: "Alerta: O valor de ${formatCurrency(transaction.amount)} para ${categoryName} parece mais alto que seus gastos usuais nesta categoria. Está correto?"
  Se o valor parecer normal ou não houver dados suficientes para comparar, responda APENAS com a palavra "NORMAL".
  Não use markdown. Não faça perguntas no final, apenas o alerta como no exemplo.
  Alerta:`;
};

const constructPromptForCashFlowProjection = (context: FinancialContext, projectionPeriodDays: number): string => {
  const endDate = new Date(context.currentDate);
  endDate.setDate(endDate.getDate() + projectionPeriodDays);
  const endDateStr = getISODateString(endDate);

  const upcomingRecurring = context.recurringTransactions
    ?.filter(rt => rt.next_due_date <= endDateStr)
    .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())
    .map(rt => `- ${rt.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}: ${rt.description} (${formatCurrency(rt.amount)}) em ${formatDate(rt.next_due_date)}`)
    .join('\n');
  
  const oneMonthAgo = new Date(context.currentDate);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recentNonRecurringExpenses = context.transactions
    ?.filter(t => t.type === TransactionType.EXPENSE && 
                  t.date >= getISODateString(oneMonthAgo) && 
                  !context.recurringTransactions?.some(rt => rt.description.toLowerCase().includes(t.description?.toLowerCase() || 'xxxx')))
    .reduce((acc, t) => {
      const catName = context.categories.find(c => c.id === t.category_id)?.name || 'Outras Despesas';
      acc[catName] = (acc[catName] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
  
  const recentSpendingSummary = recentNonRecurringExpenses 
    ? Object.entries(recentNonRecurringExpenses)
        .map(([cat, total]) => `- ${cat}: aprox. ${formatCurrency(total)}/mês`)
        .join('\n')
    : 'Nenhum padrão recente de gastos discricionários encontrado.';

  let simulatedTxDetails = '';
  if (context.simulatedTransactionData) {
    const sim = context.simulatedTransactionData;
    simulatedTxDetails = `\nConsidere também a seguinte transação SIMULADA para esta projeção:
- Tipo: ${sim.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}
- Valor: ${formatCurrency(sim.amount)}
- Data: ${formatDate(sim.date)}
- Descrição: ${sim.description || (sim.type === TransactionType.INCOME ? 'Receita Simulada' : 'Despesa Simulada')}
Esta simulação NÃO está salva, use-a apenas para esta projeção.`;
  }

  return `Você é um assistente financeiro. Preveja o fluxo de caixa do usuário para os próximos ${projectionPeriodDays} dias.
Data Atual: ${context.currentDate}.
Projeção até: ${formatDate(endDateStr)}.
Renda Mensal Informada: ${context.monthlyIncome ? formatCurrency(context.monthlyIncome) : 'Não informada (use apenas recorrências e histórico)'}.
${simulatedTxDetails}

Saldos Atuais das Contas Principais:
${context.accounts.map(acc => {
  const balanceInfo = context.accountBalances.find(b => b.accountId === acc.id);
  return `- ${acc.name}: ${balanceInfo ? formatCurrency(balanceInfo.balance) : 'N/A'}`;
}).join('\n')}
Saldo Total Combinado: ${formatCurrency(context.accountBalances.reduce((sum, ab) => sum + ab.balance, 0))}

Transações Recorrentes Programadas (Receitas e Despesas) no Período:
${upcomingRecurring || 'Nenhuma transação recorrente programada no período.'}

Padrão de Gastos Discricionários Recentes (último mês, não recorrentes):
${recentSpendingSummary}

Analise essas informações e forneça uma projeção textual do fluxo de caixa.
Destaque:
1.  Um resumo geral (ex: "Seu saldo deve permanecer positivo", "Prevê-se um aperto financeiro em meados de [Mês]").
2.  Principais entradas e saídas esperadas e suas datas.
3.  Qualquer data onde o saldo possa ficar perigosamente baixo ou negativo, se aplicável.
Se uma simulação foi fornecida, mencione brevemente o impacto dela.
Seja conciso (3-5 frases). Não use markdown. Responda apenas com a projeção. Se não puder projetar confiavelmente, diga "Não foi possível gerar uma projeção de fluxo de caixa detalhada com os dados atuais."
Projeção:`;
};

const constructPromptForDebtStrategyExplanation = (strategy: DebtStrategy): string => {
  let strategyName = "";
  let coreConcept = "";
  switch (strategy) {
    case 'snowball':
      strategyName = "Bola de Neve (Snowball)";
      coreConcept = "prioriza quitar as dívidas com os menores saldos primeiro, independentemente das taxas de juros, para obter vitórias rápidas e motivação.";
      break;
    case 'avalanche':
      strategyName = "Avalanche";
      coreConcept = "prioriza quitar as dívidas com as maiores taxas de juros primeiro, o que geralmente economiza mais dinheiro em juros a longo prazo.";
      break;
    case 'minimums':
       strategyName = "Pagamentos Mínimos";
      coreConcept = "consiste em pagar apenas o valor mínimo exigido em todas as dívidas. Geralmente é a forma mais lenta e cara de quitar dívidas devido ao acúmulo de juros.";
      break;
    default:
      return "Estratégia desconhecida.";
  }

  return `Você é um educador financeiro. Explique a estratégia de quitação de dívidas "${strategyName}" em termos simples.
O conceito principal desta estratégia é que ${coreConcept}.
Forneça uma breve explicação (2-3 frases) sobre como funciona, suas principais vantagens e desvantagens.
Não use markdown. Responda apenas com a explicação.
Explicação:`;
};

const constructPromptForDebtProjectionSummary = (projection: DebtProjection, debts: Debt[], context: FinancialContext): string => {
  const strategyName = projection.strategy === 'snowball' ? 'Bola de Neve' : projection.strategy === 'avalanche' ? 'Avalanche' : 'Pagamentos Mínimos';
  let debtsSummary = debts.map(d => `- ${d.name}: Saldo ${formatCurrency(d.current_balance)}, Juros ${d.interest_rate_annual}% a.a.`).join('\n');

  return `Você é um consultor financeiro. O usuário calculou um plano de quitação de dívidas.
Estratégia Utilizada: ${strategyName}.
Tempo Estimado para Quitar Todas as Dívidas: ${projection.monthsToPayoff} meses (${(projection.monthsToPayoff / 12).toFixed(1)} anos).
Total de Juros Pagos Estimado: ${formatCurrency(projection.totalInterestPaid)}.
Total Principal Pago Estimado: ${formatCurrency(projection.totalPrincipalPaid)}.
Pagamento Extra Mensal Adicionado aos Mínimos: ${formatCurrency(projection.payoffDetails[0]?.monthlyPayments[0]?.payment - debts.find(d => d.id === projection.payoffDetails[0]?.debtId)?.minimum_payment || 0 )} (se houver um extra aplicado à primeira dívida do plano).

Dívidas Incluídas no Plano:
${debtsSummary}

Renda Mensal Informada: ${context.monthlyIncome ? formatCurrency(context.monthlyIncome) : 'Não informada'}.
Saldo Total em Contas: ${formatCurrency(context.accountBalances.reduce((sum, acc) => sum + acc.balance, 0))}

Com base no resultado da projeção e no contexto financeiro do usuário, forneça um resumo e insights (2-4 frases).
Comente se o plano parece realista, se o tempo de quitação é bom, e talvez uma sugestão baseada no impacto dos juros ou no pagamento extra.
Exemplo de tom: "Este plano ${strategyName} parece eficaz, quitando suas dívidas em ${projection.monthsToPayoff} meses. O total de juros de ${formatCurrency(projection.totalInterestPaid)} é significativo; considere aumentar o pagamento extra, se possível, para acelerar."
Não use markdown. Responda apenas com o resumo.
Resumo:`;
};

const constructPromptForSafeToSpendToday = (context: FinancialContext): string => {
  const daysRemainingInMonth = context.daysInMonth - context.dayOfMonth + 1;
  const endOfMonthDate = getISODateString(new Date(new Date(context.currentDate).getFullYear(), new Date(context.currentDate).getMonth() + 1, 0));

  const upcomingFixedExpenses = context.recurringTransactions
    ?.filter(rt => rt.type === TransactionType.EXPENSE && new Date(rt.next_due_date) <= new Date(endOfMonthDate) && new Date(rt.next_due_date) >= new Date(context.currentDate) )
    .map(rt => `- ${rt.description}: ${formatCurrency(rt.amount)} em ${formatDate(rt.next_due_date)}`)
    .join('\n') || 'Nenhuma despesa recorrente significativa próxima.';

  const upcomingFixedIncome = context.recurringTransactions
    ?.filter(rt => rt.type === TransactionType.INCOME && new Date(rt.next_due_date) <= new Date(endOfMonthDate) && new Date(rt.next_due_date) >= new Date(context.currentDate))
    .map(rt => `- ${rt.description}: ${formatCurrency(rt.amount)} em ${formatDate(rt.next_due_date)}`)
    .join('\n') || 'Nenhuma receita recorrente significativa próxima.';

  const essentialBudgetInfo = context.categories
    .filter(c => c.type === TransactionType.EXPENSE && c.monthly_budget && ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Água', 'Luz', 'Gás', 'Impostos', 'Contas'].some(essential => c.name.toLowerCase().includes(essential.toLowerCase())) )
    .map(c => {
        const dailyBudget = (c.monthly_budget || 0) / context.daysInMonth;
        // Estimate remaining needed for essential budgets more simply
        const spentSoFarThisMonth = context.transactions?.filter(t => t.category_id === c.id && t.date.startsWith(context.currentDate.substring(0,7)) && t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0) || 0;
        const estimatedRemainingNeed = Math.max(0, (c.monthly_budget || 0) - spentSoFarThisMonth);
        return `- ${c.name}: Orçamento Mensal ${formatCurrency(c.monthly_budget || 0)}. Gasto até agora: ${formatCurrency(spentSoFarThisMonth)}. Necessidade estimada restante: ${formatCurrency(estimatedRemainingNeed)}.`;
    }).join('\n') || 'Nenhum orçamento para despesas essenciais definido.';
  
  const savingsGoalsInfo = context.moneyBoxes && context.moneyBoxes.length > 0 ? context.moneyBoxes.map(mb => {
        const balanceInfo = context.moneyBoxBalances?.find(b => b.moneyBoxId === mb.id);
        // Assume a simple monthly contribution goal if not specified otherwise for AI
        const monthlyContributionSuggestion = mb.goal_amount ? formatCurrency(mb.goal_amount / 12) + " (sugestão anual/12)" : "N/A";
        return `- ${mb.name}: Saldo Atual ${balanceInfo ? formatCurrency(balanceInfo.balance) : formatCurrency(0)} ${mb.goal_amount ? `(Meta Total: ${formatCurrency(mb.goal_amount)})` : ''}. Contribuição mensal sugerida para meta: ${monthlyContributionSuggestion}`;
    }).join('\n') : 'Nenhuma caixinha de economia configurada.';


  return `Você é um consultor financeiro especialista em planejamento de gastos diários.
Baseado no contexto financeiro completo do usuário, calcule um valor "seguro para gastar HOJE" em despesas discricionárias (lazer, compras não essenciais, etc.).
Este valor deve permitir que o usuário cubra todas as suas despesas recorrentes e orçamentos essenciais até o final do mês corrente, além de idealmente permitir alguma contribuição para suas metas de economia, sem comprometer sua saúde financeira no curto prazo.

Data Atual: ${context.currentDate} (Dia ${context.dayOfMonth} de ${context.daysInMonth} dias no mês).
Renda Mensal Informada: ${context.monthlyIncome ? formatCurrency(context.monthlyIncome) : 'Não informada'}.

Saldos Atuais em Contas Líquidas (some todos para ter o total disponível agora):
${context.accounts.map(acc => {
    const balanceInfo = context.accountBalances.find(b => b.accountId === acc.id);
    return `- ${acc.name}: Saldo ${balanceInfo ? formatCurrency(balanceInfo.balance) : 'N/A'}`;
}).join('\n') || 'Nenhuma conta líquida informada.'}
Saldo Total Líquido Atual: ${formatCurrency(context.accountBalances.reduce((sum, acc) => sum + acc.balance, 0))}

Próximas Despesas Recorrentes Fixas (até o fim do mês atual - ${daysRemainingInMonth} dias restantes):
${upcomingFixedExpenses}

Próximas Receitas Recorrentes Fixas (até o fim do mês atual):
${upcomingFixedIncome}

Orçamentos Mensais para Despesas Essenciais/Planejadas (some o valor restante proporcional para o resto do mês):
${essentialBudgetInfo}

Metas de Economia (Caixinhas):
${savingsGoalsInfo}

O valor "seguro para gastar hoje" deve ser uma sugestão realista para despesas variáveis e não essenciais.
Considere o saldo total, as receitas e despesas fixas até o final do mês. Subtraia uma estimativa para despesas essenciais orçadas para o restante do mês.
Se os fundos estiverem muito apertados ou a projeção indicar saldo negativo, o valor "seguro para gastar hoje" deve ser R$0 ou muito baixo, com uma explicação clara.
Não se baseie apenas em (Saldo Atual / Dias Restantes). Considere o fluxo de caixa futuro e as obrigações.

Responda APENAS com um objeto JSON contendo as chaves:
- "safeAmount": number (o valor que pode ser gasto hoje em despesas variáveis; pode ser 0. Arredonde para duas casas decimais se não for inteiro.)
- "explanation": string (uma breve explicação concisa de como chegou a esse valor ou um aviso se estiver apertado, ex: "Considerando suas contas a pagar e orçamentos essenciais, este é seu limite para gastos variáveis hoje." ou "Seu fluxo de caixa está apertado. Evite gastos não essenciais hoje.")
- "calculationDate": string (data atual no formato YYYY-MM-DD)

Exemplo de resposta positiva: {"safeAmount": 75.50, "explanation": "Após reservar para contas e orçamentos, este é seu limite para gastos variáveis hoje.", "calculationDate": "${context.currentDate}"}
Exemplo de resposta restritiva: {"safeAmount": 0, "explanation": "Suas despesas programadas e orçamentos essenciais consomem sua renda prevista. Evite gastos não essenciais hoje para não comprometer o orçamento.", "calculationDate": "${context.currentDate}"}
Se não for possível calcular confiavelmente (ex: falta de dados cruciais como saldos de conta ou despesas recorrentes), retorne: {"safeAmount": null, "explanation": "Não foi possível calcular com os dados atuais. Verifique seus saldos de conta, transações recorrentes e orçamentos.", "calculationDate": "${context.currentDate}"}

Cálculo:`;
};


const safeGenerateContent = async (
    prompt: string, 
    insightTypeForError: AIInsightType, 
    relatedId?: string 
): Promise<string | null> => {
    if (!ai || !isGeminiApiKeyAvailable()) {
        console.warn(`Gemini API not available for ${insightTypeForError}.`);
        return null; 
    }
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
        });
        const text = response.text?.trim();
        if (text && text.toUpperCase() !== "NORMAL") {
            return text;
        }
        return null; 
    } catch (error) {
        console.error(`Error fetching ${insightTypeForError} from Gemini:`, error);
        return null;
    }
};

export const fetchGeneralAdvice = async (context: FinancialContext): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    console.warn("Gemini API not available for fetchGeneralAdvice.");
    return {
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
        timestamp: new Date().toISOString(), 
        type: 'general_advice',
        content: text,
        is_read: false,
      };
    }
    return { 
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
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: errorMessage,
        is_read: false,
      };
  }
};

export const fetchCommentForTransaction = async (transaction: Transaction, context: FinancialContext, categoryName?: string, accountName?: string): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    console.warn("Gemini API not available for fetchCommentForTransaction.");
     return { 
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
        timestamp: new Date().toISOString(), 
        type: 'transaction_comment',
        content: text,
        related_transaction_id: transaction.id,
        is_read: false,
      };
    }
    return { 
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
): Promise<{ suggestedBudget: number } | Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    if (!ai || !isGeminiApiKeyAvailable()) {
        console.warn("Gemini API not available for fetchBudgetSuggestion.");
        return {
            timestamp: new Date().toISOString(),
            type: 'error_message',
            content: "AI Coach desativado ou API Key (GEMINI_API_KEY) não configurada para sugerir orçamentos.",
            is_read: false,
        };
    }
    if (!monthlyIncome || monthlyIncome <= 0) {
         return {
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

        if (parsed && typeof parsed.suggestedBudget === 'number' && parsed.suggestedBudget >= 0) { 
            return { suggestedBudget: parsed.suggestedBudget };
        }
        return { 
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
): Promise<{ analysisText: string; recommendedStatus: FuturePurchaseStatus } | Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    return {
      timestamp: new Date().toISOString(), type: 'error_message',
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
        timestamp: new Date().toISOString(), type: 'error_message',
        content: "Não foi possível obter uma análise válida da IA para esta compra (resposta inválida).",
        related_future_purchase_id: purchase.id, is_read: false,
    };
  } catch (error) {
    console.error("Error fetching future purchase analysis from Gemini:", error);
    let errorMessage = "Desculpe, não consegui analisar esta compra futura no momento.";
    if (error instanceof Error) errorMessage += ` Detalhe: ${error.message}`;
    return {
        timestamp: new Date().toISOString(), type: 'error_message',
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
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    
    const parsedResult = JSON.parse(jsonStr) as BestPurchaseDayInfo;

    if (parsedResult.error) {
        console.warn("Gemini returned an error for best purchase day:", parsedResult.error);
        return { ...parsedResult, explanation: parsedResult.error }; 
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

export const fetchSpendingAnomalyInsight = async (
    categoryName: string, 
    currentSpend: number, 
    proRataBudget: number,
    budget: number | undefined, 
    context: FinancialContext | undefined,
    categoryId: string
): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    const prompt = constructPromptForSpendingAnomaly(categoryName, currentSpend, proRataBudget, budget, context);
    const content = await safeGenerateContent(prompt, 'spending_anomaly_category', categoryId);
    if (content) {
        return {
            timestamp: new Date().toISOString(),
            type: 'spending_anomaly_category',
            content: content,
            related_category_id: categoryId,
            is_read: false,
        };
    }
    return null;
};

export const fetchBudgetOverspendProjectionInsight = async (
    categoryName: string,
    currentSpend: number,
    budget: number,
    daysRemaining: number,
    projectedSpend: number,
    context: FinancialContext | undefined,
    categoryId: string
): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    const prompt = constructPromptForBudgetOverspendProjection(categoryName, currentSpend, budget, daysRemaining, projectedSpend, context);
    const content = await safeGenerateContent(prompt, 'budget_overspend_projection', categoryId);
     if (content) {
        return {
            timestamp: new Date().toISOString(),
            type: 'budget_overspend_projection',
            content: content,
            related_category_id: categoryId,
            is_read: false,
        };
    }
    return null;
};

export const fetchRecurringPaymentCandidateInsight = async (
    transactions: Transaction[],
    existingRecurringTransactions: RecurringTransaction[],
    context: FinancialContext
): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    const prompt = constructPromptForRecurringPaymentCandidate(transactions, existingRecurringTransactions.map(rt => ({description: rt.description, amount: rt.amount, type:rt.type, frequency: rt.frequency, category_id: rt.category_id})), context);
    const content = await safeGenerateContent(prompt, 'recurring_payment_candidate');
    if (content) {
        return {
            timestamp: new Date().toISOString(),
            type: 'recurring_payment_candidate',
            content: content,
            is_read: false,
        };
    }
    return null;
};

export const fetchSavingOpportunityInsight = async (
    transactions: Transaction[],
    categories: Category[],
    moneyBoxes: MoneyBox[],
    context: FinancialContext
): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    const prompt = constructPromptForSavingOpportunity(transactions, categories.map(c=> ({id:c.id, name: c.name, type:c.type})), moneyBoxes.map(m=>({id: m.id, name:m.name, goal_amount: m.goal_amount})), context);
    const content = await safeGenerateContent(prompt, 'saving_opportunity_suggestion');
    if (content) {
        return {
            timestamp: new Date().toISOString(),
            type: 'saving_opportunity_suggestion',
            content: content,
            is_read: false,
        };
    }
    return null;
};

export const fetchUnusualTransactionInsight = async (
    transaction: Transaction,
    categoryName: string,
    recentCategoryTransactions: Transaction[],
    context: FinancialContext
): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    const prompt = constructPromptForUnusualTransactionValue(transaction, categoryName, recentCategoryTransactions, context);
    const content = await safeGenerateContent(prompt, 'unusual_transaction_value', transaction.category_id);
    if (content) {
        return {
            timestamp: new Date().toISOString(),
            type: 'unusual_transaction_value',
            content: content,
            related_transaction_id: transaction.id,
            related_category_id: transaction.category_id,
            is_read: false,
        };
    }
    return null;
};

export const fetchCashFlowProjectionInsight = async (
    context: FinancialContext,
    projectionPeriodDays: number
): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    const prompt = constructPromptForCashFlowProjection(context, projectionPeriodDays);
    const content = await safeGenerateContent(prompt, 'cash_flow_projection');
    if (content) {
        return {
            timestamp: new Date().toISOString(),
            type: 'cash_flow_projection',
            content: content,
            is_read: false,
        };
    }
     return { 
        timestamp: new Date().toISOString(),
        type: 'error_message',
        content: "Não foi possível gerar uma projeção de fluxo de caixa com os dados atuais.",
        is_read: false,
    };
};


export const fetchDebtStrategyExplanation = async (strategy: DebtStrategy): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    if (!ai || !isGeminiApiKeyAvailable()) {
        return {
            timestamp: new Date().toISOString(), type: 'error_message',
            content: "AI Coach desativado ou API Key não configurada para explicar estratégia de dívida.",
            related_debt_strategy: strategy, is_read: false,
        };
    }
    const prompt = constructPromptForDebtStrategyExplanation(strategy);
    const content = await safeGenerateContent(prompt, 'debt_strategy_explanation');
    if (content) {
        return {
            timestamp: new Date().toISOString(), type: 'debt_strategy_explanation',
            content: content, related_debt_strategy: strategy, is_read: false,
        };
    }
    return {
        timestamp: new Date().toISOString(), type: 'error_message',
        content: `Não foi possível obter uma explicação para a estratégia ${strategy} no momento.`,
        related_debt_strategy: strategy, is_read: false,
    };
};

export const fetchDebtProjectionSummary = async (projection: DebtProjection, debtsContext: Debt[], context: FinancialContext): Promise<Omit<AIInsight, 'id' | 'user_id' | 'profile_id' | 'created_at' | 'updated_at'> | null> => {
    if (!ai || !isGeminiApiKeyAvailable()) {
        return {
            timestamp: new Date().toISOString(), type: 'error_message',
            content: "AI Coach desativado ou API Key não configurada para resumir projeção de dívida.",
            is_read: false,
        };
    }
    const fullContext = {...context, debts: debtsContext };
    const prompt = constructPromptForDebtProjectionSummary(projection, debtsContext, fullContext);
    const content = await safeGenerateContent(prompt, 'debt_projection_summary');
    if (content) {
        return {
            timestamp: new Date().toISOString(), type: 'debt_projection_summary',
            content: content, related_debt_strategy: projection.strategy, is_read: false,
        };
    }
     return {
        timestamp: new Date().toISOString(), type: 'error_message',
        content: "Não foi possível obter um resumo da projeção de dívida no momento.",
        is_read: false,
    };
};

export const fetchSafeToSpendTodayAdvice = async (
  context: FinancialContext
): Promise<SafeToSpendTodayInfo | null> => {
  if (!ai || !isGeminiApiKeyAvailable()) {
    console.warn("Gemini API not available for fetchSafeToSpendTodayAdvice.");
    return {
      safeAmount: null,
      explanation: "AI Coach desativado ou API Key não configurada.",
      calculationDate: context.currentDate,
      error: "AI Coach desativado ou API Key não configurada."
    };
  }

  const prompt = constructPromptForSafeToSpendToday(context);
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
    });

    let jsonStr = response.text?.trim() || '';
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    
    const parsedResult = JSON.parse(jsonStr);

    if (parsedResult.error) {
        console.warn("Gemini returned an error for safe to spend today:", parsedResult.error);
        return { ...parsedResult, explanation: parsedResult.error, calculationDate: parsedResult.calculationDate || context.currentDate };
    }
    // Ensure safeAmount is a number or null, and other fields are strings
    if (typeof parsedResult.explanation === 'string' && 
        typeof parsedResult.calculationDate === 'string' &&
        (typeof parsedResult.safeAmount === 'number' || parsedResult.safeAmount === null)) {
        return parsedResult as SafeToSpendTodayInfo;
    }
    
    console.error("Invalid JSON structure received from Gemini for safeToSpendToday:", parsedResult);
    return {
        safeAmount: null,
        explanation: "Não foi possível determinar o valor seguro para gastar hoje (resposta inválida da IA).",
        calculationDate: context.currentDate,
        error: "Resposta inválida da IA."
    };

  } catch (error) {
    console.error("Error fetching safe to spend today advice from Gemini:", error);
    let errorMessage = "Desculpe, não consegui calcular o valor seguro para gastar hoje.";
    if (error instanceof Error) {
        errorMessage += ` Detalhe: ${error.message}`;
    }
    return {
        safeAmount: null,
        explanation: errorMessage,
        calculationDate: context.currentDate,
        error: errorMessage
    };
  }
};


export const calculateNextDueDate = (currentDueDate: string, frequency: RecurringTransactionFrequency, customIntervalDays?: number): string => {
  const date = new Date(currentDueDate + 'T00:00:00'); 
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
      break; 
  }
  return getISODateString(date);
};
