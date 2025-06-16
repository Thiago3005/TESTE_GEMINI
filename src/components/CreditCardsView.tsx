
import React from 'react';
import { useState } from 'react';
import { CreditCard, InstallmentPurchase } from '../types';
import CreditCardItem from './CreditCardItem';
import CreditCardFormModal from './CreditCardFormModal';
import InstallmentPurchaseFormModal from './InstallmentPurchaseFormModal';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';

interface CreditCardsViewProps {
  creditCards: CreditCard[];
  installmentPurchases: InstallmentPurchase[];
  onAddCreditCard: (card: CreditCard) => void;
  onUpdateCreditCard: (card: CreditCard) => void;
  onDeleteCreditCard: (cardId: string) => void;
  onAddInstallmentPurchase: (purchase: InstallmentPurchase) => void;
  onUpdateInstallmentPurchase: (purchase: InstallmentPurchase) => void;
  onDeleteInstallmentPurchase: (purchaseId: string) => void;
  onMarkInstallmentPaid: (purchaseId: string) => void;
}

const CreditCardsView: React.FC<CreditCardsViewProps> = ({
  creditCards,
  installmentPurchases,
  onAddCreditCard,
  onUpdateCreditCard,
  onDeleteCreditCard,
  onAddInstallmentPurchase,
  onUpdateInstallmentPurchase,
  onDeleteInstallmentPurchase,
  onMarkInstallmentPaid,
}) => {
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<InstallmentPurchase | null>(null);
  const [selectedCardForInstallment, setSelectedCardForInstallment] = useState<CreditCard | null>(null);


  const handleOpenNewCardModal = () => {
    setEditingCard(null);
    setIsCardModalOpen(true);
  };

  const handleOpenEditCardModal = (card: CreditCard) => {
    setEditingCard(card);
    setIsCardModalOpen(true);
  };
  
  const handleSaveCard = (card: CreditCard) => {
    if (editingCard) {
      onUpdateCreditCard(card);
    } else {
      onAddCreditCard(card);
    }
  };

  const handleOpenNewInstallmentModal = (card: CreditCard) => {
    setSelectedCardForInstallment(card);
    setEditingInstallment(null);
    setIsInstallmentModalOpen(true);
  };
  
  const handleOpenEditInstallmentModal = (purchase: InstallmentPurchase, card: CreditCard) => {
    setSelectedCardForInstallment(card);
    setEditingInstallment(purchase);
    setIsInstallmentModalOpen(true);
  };

  const handleSaveInstallment = (purchase: InstallmentPurchase) => {
    if (editingInstallment) {
      onUpdateInstallmentPurchase(purchase);
    } else {
      onAddInstallmentPurchase(purchase);
    }
  };


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Cartões de Crédito</h1>
        <Button onClick={handleOpenNewCardModal} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Novo Cartão
        </Button>
      </div>

      {creditCards.length > 0 ? (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {creditCards.map(card => (
            <CreditCardItem
              key={card.id}
              card={card}
              installmentPurchases={installmentPurchases.filter(ip => ip.creditCardId === card.id)}
              onEditCard={handleOpenEditCardModal}
              onDeleteCard={onDeleteCreditCard}
              onAddInstallmentPurchase={handleOpenNewInstallmentModal}
              onEditInstallmentPurchase={handleOpenEditInstallmentModal}
              onDeleteInstallmentPurchase={onDeleteInstallmentPurchase}
              onMarkInstallmentPaid={onMarkInstallmentPaid}
            />
          ))}
        </ul>
      ) : (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhum cartão de crédito cadastrado.</p>
      )}

      <CreditCardFormModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSave={handleSaveCard}
        existingCard={editingCard}
      />
      
      {selectedCardForInstallment && (
        <InstallmentPurchaseFormModal
            isOpen={isInstallmentModalOpen}
            onClose={() => setIsInstallmentModalOpen(false)}
            onSave={handleSaveInstallment}
            creditCard={selectedCardForInstallment}
            existingPurchase={editingInstallment}
        />
      )}

    </div>
  );
};

export default CreditCardsView;