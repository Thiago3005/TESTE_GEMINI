
import React from 'react';
import { useState, useCallback } from 'react';
import { CreditCard, InstallmentPurchase, AIConfig, BestPurchaseDayInfo } from '../types';
import CreditCardItem from './CreditCardItem';
import CreditCardFormModal from './CreditCardFormModal';
import InstallmentPurchaseFormModal from './InstallmentPurchaseFormModal';
import BestPurchaseDayModal from './BestPurchaseDayModal'; // New Modal
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import { useToasts } from '../contexts/ToastContext';
import * as geminiService from '../services/geminiService';
import { getISODateString } from '../utils/helpers';


interface CreditCardsViewProps {
  creditCards: CreditCard[];
  installmentPurchases: InstallmentPurchase[];
  aiConfig: AIConfig; 
  onAddCreditCard: (card: Omit<CreditCard, 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdateCreditCard: (card: CreditCard) => void;
  onDeleteCreditCard: (cardId: string) => void;
  onAddInstallmentPurchase: (purchase: Omit<InstallmentPurchase, 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdateInstallmentPurchase: (purchase: InstallmentPurchase) => void;
  onDeleteInstallmentPurchase: (purchaseId: string) => void;
  onMarkInstallmentPaid: (purchaseId: string) => void;
  onPayMonthlyInstallments: (cardId: string) => Promise<void>;
  isPrivacyModeEnabled?: boolean; 
}

const CreditCardsView: React.FC<CreditCardsViewProps> = ({
  creditCards,
  installmentPurchases,
  aiConfig, 
  onAddCreditCard,
  onUpdateCreditCard,
  onDeleteCreditCard,
  onAddInstallmentPurchase,
  onUpdateInstallmentPurchase,
  onDeleteInstallmentPurchase,
  onMarkInstallmentPaid,
  onPayMonthlyInstallments,
  isPrivacyModeEnabled,
}) => {
  const { addToast } = useToasts();
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<InstallmentPurchase | null>(null);
  const [selectedCardForInstallment, setSelectedCardForInstallment] = useState<CreditCard | null>(null);

  // State for Best Purchase Day Modal
  const [isBestDayModalOpen, setIsBestDayModalOpen] = useState(false);
  const [bestDayAdvice, setBestDayAdvice] = useState<BestPurchaseDayInfo | null>(null);
  const [isLoadingBestDay, setIsLoadingBestDay] = useState(false);
  const [selectedCardForBestDay, setSelectedCardForBestDay] = useState<CreditCard | null>(null);


  const handleOpenNewCardModal = () => {
    setEditingCard(null);
    setIsCardModalOpen(true);
  };

  const handleOpenEditCardModal = (card: CreditCard) => {
    setEditingCard(card);
    setIsCardModalOpen(true);
  };
  
  const handleSaveCard = (card: Omit<CreditCard, 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingCard) {
      onUpdateCreditCard({ ...card, user_id: editingCard.user_id, created_at: editingCard.created_at, updated_at: new Date().toISOString() });
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

  const handleSaveInstallment = (purchase: Omit<InstallmentPurchase, 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingInstallment) {
      onUpdateInstallmentPurchase({ ...purchase, user_id: editingInstallment.user_id, created_at: editingInstallment.created_at, updated_at: new Date().toISOString()});
    } else {
      onAddInstallmentPurchase(purchase);
    }
  };
  
  const handleGetBestPurchaseDay = useCallback(async (cardId: string) => {
    if (!aiConfig.isEnabled || aiConfig.apiKeyStatus !== 'available') {
      addToast("AI Coach desativado ou API Key indisponível.", 'warning');
      return;
    }
    const card = creditCards.find(c => c.id === cardId);
    if (!card) return;

    setSelectedCardForBestDay(card);
    setIsLoadingBestDay(true);
    setIsBestDayModalOpen(true);
    setBestDayAdvice(null);

    const advice = await geminiService.fetchBestPurchaseDayAdvice(
        { name: card.name, closing_day: card.closing_day, due_day: card.due_day },
        getISODateString()
    );
    
    setBestDayAdvice(advice);
    setIsLoadingBestDay(false);
    
    if (advice?.error) {
        addToast(advice.explanation || "Erro ao buscar sugestão da IA.", 'error');
    }
  }, [aiConfig, creditCards, addToast]);


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
              installmentPurchases={installmentPurchases.filter(ip => ip.credit_card_id === card.id)}
              onEditCard={handleOpenEditCardModal}
              onDeleteCard={onDeleteCreditCard}
              onAddInstallmentPurchase={handleOpenNewInstallmentModal}
              onEditInstallmentPurchase={handleOpenEditInstallmentModal}
              onDeleteInstallmentPurchase={onDeleteInstallmentPurchase}
              onMarkInstallmentPaid={onMarkInstallmentPaid}
              onGetBestPurchaseDay={handleGetBestPurchaseDay} 
              onPayMonthlyInstallments={onPayMonthlyInstallments}
              isAIFeatureEnabled={aiConfig.isEnabled && aiConfig.apiKeyStatus === 'available'}
              isPrivacyModeEnabled={isPrivacyModeEnabled}
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

      <BestPurchaseDayModal
        isOpen={isBestDayModalOpen}
        onClose={() => setIsBestDayModalOpen(false)}
        advice={bestDayAdvice}
        isLoading={isLoadingBestDay}
        cardName={selectedCardForBestDay?.name}
      />

    </div>
  );
};

export default CreditCardsView;
