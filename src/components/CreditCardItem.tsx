import React from 'react';
import { useState } from 'react';
import { CreditCard, InstallmentPurchase } from '../types';
import { formatCurrency, getISODateString } from '../utils/helpers';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import CreditCardIcon from './icons/CreditCardIcon'; 

interface CreditCardItemProps {
  card: CreditCard;
  installmentPurchases: InstallmentPurchase[];
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (cardId: string) => void;
  onAddInstallmentPurchase: (card: CreditCard) => void;
  onEditInstallmentPurchase: (purchase: InstallmentPurchase, card: CreditCard) => void;
  onDeleteInstallmentPurchase: (purchaseId: string) => void;
  onMarkInstallmentPaid: (purchaseId: string) => void;
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
}) => {
  const [showInstallments, setShowInstallments] = useState(false);

  const cardInstallments = installmentPurchases.filter(p => p.creditCardId === card.id);

  const totalOutstandingDebt = cardInstallments.reduce((sum, p) => {
    const installmentValue = p.totalAmount / p.numberOfInstallments;
    const remainingInstallments = p.numberOfInstallments - p.installmentsPaid;
    return sum + (installmentValue * remainingInstallments);
  }, 0);
  const availableLimit = card.limit - totalOutstandingDebt;

  const upcomingInstallments = cardInstallments
    .filter(p => p.installmentsPaid < p.numberOfInstallments)
    .sort((a,b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

  const nextPaymentAmount = upcomingInstallments.length > 0 ? (upcomingInstallments[0].totalAmount / upcomingInstallments[0].numberOfInstallments) : 0;
  
   const calculateNextDueDate = (purchase: InstallmentPurchase): string => {
    const purchaseDateObj = new Date(purchase.purchaseDate + 'T00:00:00'); // Ensure local date
    const purchaseMonth = purchaseDateObj.getMonth();
    const purchaseYear = purchaseDateObj.getFullYear();
    
    // Calculate month for next payment
    // JS months are 0-indexed. Add installmentsPaid.
    let nextPaymentMonth = purchaseMonth + purchase.installmentsPaid;
    let nextPaymentYear = purchaseYear + Math.floor(nextPaymentMonth / 12);
    nextPaymentMonth = nextPaymentMonth % 12;
    
    const date = new Date(nextPaymentYear, nextPaymentMonth, card.dueDay);
    return getISODateString(date);
  };


  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <CreditCardIcon className="w-6 h-6 text-primary dark:text-primaryDark" />
            <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">{card.name}</h3>
          </div>
          <p className="text-sm text-textMuted dark:text-textMutedDark">Limite Total: {formatCurrency(card.limit)}</p>
          <p className={`text-sm font-medium ${availableLimit >=0 ? 'text-secondary dark:text-secondaryDark' : 'text-destructive dark:text-destructiveDark'}`}>
            Limite Disponível: {formatCurrency(availableLimit)}
          </p>
          <p className="text-xs text-textMuted dark:text-textMutedDark">Fechamento: Dia {card.closingDay} | Vencimento: Dia {card.dueDay}</p>
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
      
      {cardInstallments.length > 0 && (
        <div>
            <Button variant="ghost" size="sm" onClick={() => setShowInstallments(!showInstallments)} className="text-sm text-primary dark:text-primaryDark hover:underline">
                {showInstallments ? 'Ocultar' : 'Mostrar'} {cardInstallments.length} Compra(s) Parcelada(s)
                {nextPaymentAmount > 0 && !showInstallments && (
                    <span className="ml-2 text-xs text-destructive dark:text-destructiveDark">(Próx. Parcela: ~{formatCurrency(nextPaymentAmount)})</span>
                )}
            </Button>
        </div>
      )}

      {showInstallments && cardInstallments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-borderBase/50 dark:border-borderBaseDark/50 space-y-2">
          <h4 className="text-sm font-semibold text-textMuted dark:text-textMutedDark">Compras Parceladas:</h4>
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-1"> {/* Added scrollbar styling if needed */}
            {cardInstallments.map(p => {
              const amountPerInstallment = p.totalAmount / p.numberOfInstallments;
              const isPaid = p.installmentsPaid >= p.numberOfInstallments;
              return (
                <li key={p.id} className={`p-2 rounded ${isPaid ? 'bg-green-500/10 dark:bg-green-500/20' : 'bg-blue-500/10 dark:bg-blue-500/20'}`}>
                  <div className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-medium text-textBase dark:text-textBaseDark">{p.description}</p>
                      <p className="text-xs text-textMuted dark:text-textMutedDark">
                        {formatCurrency(amountPerInstallment)} x {p.numberOfInstallments} parcelas 
                        ({p.installmentsPaid}/{p.numberOfInstallments} pagas)
                      </p>
                      <p className="text-xs text-textMuted dark:text-textMutedDark">Total: {formatCurrency(p.totalAmount)} | Compra: {getISODateString(new Date(p.purchaseDate + 'T00:00:00'))}</p>
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