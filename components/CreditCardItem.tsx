
import React from 'react';
import { useState } from 'react';
import { CreditCard, InstallmentPurchase } from '../types';
import { formatCurrency, getISODateString, formatDate } from '../utils/helpers';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import CreditCardIcon from './icons/CreditCardIcon'; 
import SparklesIcon from './icons/SparklesIcon'; // New Icon

interface CreditCardItemProps {
  card: CreditCard;
  installmentPurchases: InstallmentPurchase[];
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (cardId: string) => void;
  onAddInstallmentPurchase: (card: CreditCard) => void;
  onEditInstallmentPurchase: (purchase: InstallmentPurchase, card: CreditCard) => void;
  onDeleteInstallmentPurchase: (purchaseId: string) => void;
  onMarkInstallmentPaid: (purchaseId: string) => void;
  onGetBestPurchaseDay: (cardId: string) => void; // New prop
  isAIFeatureEnabled: boolean; // New prop to control AI button visibility/state
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
  isAIFeatureEnabled,
  isPrivacyModeEnabled,
}) => {
  const [showInstallments, setShowInstallments] = useState(false);

  const cardInstallments = installmentPurchases.filter(p => p.credit_card_id === card.id);

  const totalOutstandingDebt = cardInstallments.reduce((sum, p) => {
    const installmentValue = p.total_amount / p.number_of_installments;
    const remainingInstallments = p.number_of_installments - p.installments_paid;
    return sum + (installmentValue * remainingInstallments);
  }, 0);
  const availableLimit = card.card_limit - totalOutstandingDebt;

  const upcomingInstallments = cardInstallments
    .filter(p => p.installments_paid < p.number_of_installments)
    .sort((a,b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime());

  const nextPaymentAmount = upcomingInstallments.length > 0 ? (upcomingInstallments[0].total_amount / upcomingInstallments[0].number_of_installments) : 0;
  
   const calculateNextDueDate = (purchase: InstallmentPurchase): string => {
    const purchaseDateObj = new Date(purchase.purchase_date + 'T00:00:00'); 
    // This is a simplified calculation and might not be perfectly accurate for all CC billing cycles,
    // especially around month-end and varying month lengths.
    // For a more precise calculation, a library or more complex date logic would be needed.
    // The AI will provide a more robust calculation for the "best day" feature.
    let dueMonth = purchaseDateObj.getMonth() + purchase.installments_paid + 1; // +1 because first payment is next month
    let dueYear = purchaseDateObj.getFullYear();
    if (dueMonth > 11) { // Month is 0-indexed
        dueYear += Math.floor(dueMonth / 12);
        dueMonth = dueMonth % 12;
    }
    // Using formatDate for consistency, but a specific date construction might be better.
    return formatDate(getISODateString(new Date(dueYear, dueMonth, card.due_day)));
  };


  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <CreditCardIcon className="w-6 h-6 text-primary dark:text-primaryDark" />
            <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">{card.name}</h3>
          </div>
          <p className="text-sm text-textMuted dark:text-textMutedDark">
            Limite Total: {formatCurrency(card.card_limit, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
          <p className={`text-sm font-medium ${availableLimit >=0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            Limite Disponível: {formatCurrency(availableLimit, 'BRL', 'pt-BR', isPrivacyModeEnabled)}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark">Fechamento: Dia {card.closing_day} | Vencimento: Dia {card.due_day}</p>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onEditCard(card)} aria-label="Editar Cartão">
              <EditIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDeleteCard(card.id)} 
              aria-label="Excluir Cartão"
              disabled={cardInstallments.length > 0}
              title={cardInstallments.length > 0 ? "Exclua as compras parceladas primeiro" : "Excluir cartão"}
            >
              <TrashIcon className={`w-4 h-4 ${cardInstallments.length > 0 ? 'text-neutral/50 dark:text-neutralDark/50' : 'text-destructive dark:text-destructiveDark'}`} />
            </Button>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onAddInstallmentPurchase(card)}>
            <PlusIcon className="w-4 h-4 mr-1" /> Parcelamento
          </Button>
        </div>
      </div>
       {isAIFeatureEnabled && (
         <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onGetBestPurchaseDay(card.id)} 
            className="text-primary dark:text-primaryDark hover:underline !justify-start !p-1 w-full text-left"
            title="Ver melhor dia para compra com IA"
          >
           <SparklesIcon className="w-4 h-4 mr-1.5" /> Melhor Dia para Compra (IA)
         </Button>
        )}
      
      {cardInstallments.length > 0 && (
        <div>
            <Button variant="ghost" size="sm" onClick={() => setShowInstallments(!showInstallments)} className="text-sm text-primary dark:text-primaryDark hover:underline !justify-start !p-1 w-full text-left">
                {showInstallments ? 'Ocultar' : 'Mostrar'} {cardInstallments.length} Compra(s) Parcelada(s)
                {nextPaymentAmount > 0 && !showInstallments && !isPrivacyModeEnabled && (
                    <span className="ml-2 text-xs text-destructive dark:text-destructiveDark">
                        (Próx. Parcela: ~{formatCurrency(nextPaymentAmount, 'BRL', 'pt-BR', false)})
                    </span>
                )}
            </Button>
        </div>
      )}

      {showInstallments && cardInstallments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-borderBase/50 dark:border-borderBaseDark/50 space-y-2">
          <h4 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">Compras Parceladas:</h4>
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {cardInstallments.map(p => {
              const amountPerInstallment = p.total_amount / p.number_of_installments;
              const isPaid = p.installments_paid >= p.number_of_installments;
              return (
                <li key={p.id} className={`p-2 rounded ${isPaid ? 'bg-green-500/10 dark:bg-green-500/20' : 'bg-blue-500/10 dark:bg-blue-500/20'}`}>
                  <div className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-medium text-textBase dark:text-textBaseDark">{p.description}</p>
                      <p className="text-xs text-textMuted dark:text-textMutedDark">
                        {formatCurrency(amountPerInstallment, 'BRL', 'pt-BR', isPrivacyModeEnabled)} x {p.number_of_installments} parcelas 
                        ({p.installments_paid}/{p.number_of_installments} pagas)
                      </p>
                      <p className="text-xs text-textMuted dark:text-textMutedDark">
                        Total: {formatCurrency(p.total_amount, 'BRL', 'pt-BR', isPrivacyModeEnabled)} | Compra: {formatDate(p.purchase_date)}
                      </p>
                       {!isPaid && <p className="text-xs text-destructive dark:text-destructiveDark font-semibold">Próximo Venc.: ~{calculateNextDueDate(p)}</p>}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                        {!isPaid && (
                             <Button size="sm" variant="primary" onClick={() => onMarkInstallmentPaid(p.id)} className="text-xs py-0.5 px-1.5">
                                Pagar Parcela
                            </Button>
                        )}
                       <div className="flex space-x-1">
                         <Button variant="ghost" size="sm" onClick={() => onEditInstallmentPurchase(p, card)} aria-label="Editar Compra" className="p-1">
                            <EditIcon className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDeleteInstallmentPurchase(p.id)} aria-label="Excluir Compra" className="p-1">
                            <TrashIcon className="w-3 h-3 text-destructive dark:text-destructiveDark" />
                        </Button>
                       </div>
                    </div>
                  </div>
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