
import React from 'react';
import { useState } from 'react';
import { CreditCard, InstallmentPurchase } from '../types';
import { formatCurrency, getISODateString, formatDate, calculateInstallmentDueDate, getEligibleInstallmentsForBillingCycle } from '../utils/helpers';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import CreditCardIcon from './icons/CreditCardIcon'; 
import SparklesIcon from './icons/SparklesIcon';
import CheckCircleIcon from './icons/CheckCircleIcon'; // For paid installments
import InfoTooltip from './InfoTooltip';

interface CreditCardItemProps {
  card: CreditCard;
  installmentPurchases: InstallmentPurchase[];
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (cardId: string) => void;
  onAddInstallmentPurchase: (card: CreditCard) => void;
  onEditInstallmentPurchase: (purchase: InstallmentPurchase, card: CreditCard) => void;
  onDeleteInstallmentPurchase: (purchaseId: string) => void;
  onMarkInstallmentPaid: (purchaseId: string) => void;
  onGetBestPurchaseDay: (cardId: string) => void;
  onOpenPayBillModal: (card: CreditCard, billAmount: number, eligibleInstallmentIds: string[]) => void; 
  isAIFeatureEnabled: boolean;
  isPrivacyModeEnabled?: boolean; 
}

const CreditCardItem: React.FC<CreditCardItemProps> = ({
  card,
  installmentPurchases,
  onEditCard,
  onDeleteCard,
  onAddInstallmentPurchase,
  onEditInstallmentPurchase,
  onDeleteInstallmentPurchase,
  onMarkInstallmentPaid,
  onGetBestPurchaseDay, 
  onOpenPayBillModal,
  isAIFeatureEnabled,
  isPrivacyModeEnabled,
}) => {
  const [showInstallments, setShowInstallments] = useState(false);

  const cardInstallments = installmentPurchases.filter(p => p.credit_card_id === card.id);

  const totalOutstandingDebt = cardInstallments.reduce((sum, p) => {
    if (p.installments_paid >= p.number_of_installments) return sum; // Skip fully paid
    const installmentValue = p.total_amount / p.number_of_installments;
    const remainingInstallments = p.number_of_installments - p.installments_paid;
    return sum + (installmentValue * remainingInstallments);
  }, 0);
  const availableLimit = card.card_limit - totalOutstandingDebt;

  const { billAmount, eligibleInstallments } = React.useMemo(() => {
    const eligible = getEligibleInstallmentsForBillingCycle(cardInstallments, card, new Date());
    const amount = eligible.reduce((sum, p) => sum + (p.total_amount / p.number_of_installments), 0);
    return { billAmount: amount, eligibleInstallments: eligible };
  }, [cardInstallments, card]);


  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow-lg hover:shadow-xl dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <CreditCardIcon className="w-7 h-7 text-primary dark:text-primaryDark" />
            <h3 className="text-xl font-semibold text-textBase dark:text-textBaseDark">{card.name}</h3>
          </div>
          <p className="text-sm text-textMuted dark:text-textMutedDark">
            Limite Total: {formatCurrency(card.card_limit, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
          <p className={`text-md font-medium ${availableLimit >=0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            Disponível: {formatCurrency(availableLimit, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark">Fechamento: Dia {card.closing_day} | Vencimento: Dia {card.due_day}</p>
        </div>
        <div className="flex flex-col items-end space-y-1.5">
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onEditCard(card)} aria-label="Editar Cartão" className="!p-1.5">
              <EditIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDeleteCard(card.id)} 
              aria-label="Excluir Cartão"
              className="!p-1.5"
              disabled={cardInstallments.length > 0}
              title={cardInstallments.length > 0 ? "Exclua as compras parceladas primeiro" : "Excluir cartão"}
            >
              <TrashIcon className={`w-4 h-4 ${cardInstallments.length > 0 ? 'text-neutral/50 dark:text-neutralDark/50' : 'text-destructive dark:text-destructiveDark'}`} />
            </Button>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onAddInstallmentPurchase(card)} className="!text-xs !py-1 !px-2.5">
            <PlusIcon className="w-4 h-4 mr-1" /> Novo Parcelamento
          </Button>
        </div>
      </div>
      
      <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
        <div>
          <h4 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">FATURA ATUAL</h4>
          <p className="text-2xl font-bold text-destructive dark:text-destructiveDark">
            {formatCurrency(billAmount, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpenPayBillModal(card, billAmount, eligibleInstallments.map(p => p.id))}
          disabled={billAmount <= 0}
          className="w-full !text-sm"
        >
          Pagar Fatura ({eligibleInstallments.length} ite{eligibleInstallments.length === 1 ? 'm' : 'ns'})
        </Button>
      </div>
      
      <div className="space-y-2">
        {isAIFeatureEnabled && (
         <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onGetBestPurchaseDay(card.id)} 
                className="text-primary dark:text-primaryDark hover:underline !justify-start !p-1 !text-xs"
                title="Ver melhor dia para compra com IA"
            >
            <SparklesIcon className="w-4 h-4 mr-1.5" /> Melhor Dia para Compra (IA)
            </Button>
            <InfoTooltip text="A IA calcula o melhor dia para comprar (geralmente o dia após o fechamento da fatura) para maximizar o prazo de pagamento." />
         </div>
        )}
      </div>
      
      {cardInstallments.length > 0 && (
        <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowInstallments(!showInstallments)} className="text-sm text-primary dark:text-primaryDark hover:underline !justify-start !p-1 w-full text-left !font-normal">
                {showInstallments ? 'Ocultar' : 'Mostrar'} {cardInstallments.length} Compra(s) Parcelada(s)
            </Button>
        </div>
      )}

      {showInstallments && cardInstallments.length > 0 && (
        <div className="mt-2 pt-3 border-t border-borderBase/50 dark:border-borderBaseDark/50 space-y-3">
          <h4 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">Detalhes dos Parcelamentos:</h4>
          <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {cardInstallments.map(p => {
              const amountPerInstallment = p.total_amount / p.number_of_installments;
              const isFullyPaid = p.installments_paid >= p.number_of_installments;
              const nextInstallmentNumber = p.installments_paid + 1;
              const nextInstallmentDueDate = !isFullyPaid ? calculateInstallmentDueDate(p.purchase_date, nextInstallmentNumber, card.due_day) : null;
              const isEligibleForCurrentPayment = eligibleInstallments.some(eligibleP => eligibleP.id === p.id);

              return (
                <li key={p.id} className={`p-3 rounded-md ${isFullyPaid ? 'bg-green-500/10 dark:bg-green-500/20 opacity-70' : isEligibleForCurrentPayment ? 'bg-amber-500/10 dark:bg-amber-500/20' : 'bg-surface dark:bg-surfaceDark shadow-sm border border-borderBase dark:border-borderBaseDark'}`}>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-semibold text-textBase dark:text-textBaseDark">{p.description}</span>
                    <div className="flex space-x-1">
                         <Button variant="ghost" size="sm" onClick={() => onEditInstallmentPurchase(p, card)} aria-label="Editar Compra" className="!p-1">
                            <EditIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDeleteInstallmentPurchase(p.id)} aria-label="Excluir Compra" className="!p-1">
                            <TrashIcon className="w-3.5 h-3.5 text-destructive dark:text-destructiveDark" />
                        </Button>
                       </div>
                  </div>
                  
                  <div className="text-sm space-y-0.5">
                    <p className="text-textBase dark:text-textBaseDark">
                      Parcela: <span className="font-medium">{formatCurrency(amountPerInstallment, 'BRL', 'pt-BR', isPrivacyModeEnabled)}</span>
                      <span className="text-textMuted dark:text-textMutedDark"> ({p.installments_paid}/{p.number_of_installments} pagas)</span>
                    </p>
                    <p className="text-xs text-textMuted dark:text-textMutedDark">
                      Total: {formatCurrency(p.total_amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)} | Compra: {formatDate(p.purchase_date)}
                    </p>
                    {nextInstallmentDueDate && !isFullyPaid && (
                      <p className={`text-xs font-medium ${isEligibleForCurrentPayment ? 'text-red-600 dark:text-red-400' : 'text-textMuted dark:text-textMutedDark'}`}>
                        Próx. Venc. Parcela: {formatDate(getISODateString(nextInstallmentDueDate))}
                      </p>
                    )}
                  </div>

                  {!isFullyPaid && (
                     <Button 
                        size="sm" 
                        variant={"ghost"}
                        onClick={() => onMarkInstallmentPaid(p.id)} 
                        className={`text-xs py-1 px-2 mt-2.5 w-full sm:w-auto border border-borderBase dark:border-borderBaseDark`}
                      >
                        Pagar Parcela Individualmente ({nextInstallmentNumber})
                    </Button>
                  )}
                   {isFullyPaid && (
                     <p className="text-xs text-secondary dark:text-secondaryDark mt-2 font-medium flex items-center">
                       <CheckCircleIcon className="w-4 h-4 mr-1"/> Compra Totalmente Paga
                     </p>
                   )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
       {showInstallments && cardInstallments.length === 0 && (
         <p className="text-xs text-textMuted dark:text-textMutedDark text-center py-2">Nenhuma compra parcelada para este cartão.</p>
       )}
    </li>
  );
};

export default CreditCardItem;