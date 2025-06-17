import React from 'react';
import Modal from './Modal';
import { BestPurchaseDayInfo, CreditCard } from '../types';
import Button from './Button';
import LightBulbIcon from './icons/LightBulbIcon';
import SparklesIcon from './icons/SparklesIcon';

interface BestPurchaseDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  advice: BestPurchaseDayInfo | null;
  isLoading: boolean;
  cardName?: string;
}

const BestPurchaseDayModal: React.FC<BestPurchaseDayModalProps> = ({ 
  isOpen, 
  onClose, 
  advice, 
  isLoading, 
  cardName 
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Melhor Dia para Compra ${cardName ? `(${cardName})` : ''}`}
      size="md"
    >
      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-3 p-6">
          <SparklesIcon className="w-12 h-12 text-primary dark:text-primaryDark animate-pulse" />
          <p className="text-textMuted dark:text-textMutedDark">Analisando o melhor dia para sua compra...</p>
          <p className="text-xs text-textMuted dark:text-textMutedDark">Aguarde um momento.</p>
        </div>
      )}
      {!isLoading && advice && (
        <div className="space-y-4 p-2">
          {advice.error ? (
            <div className="bg-destructive/10 dark:bg-destructiveDark/20 p-4 rounded-md border-l-4 border-destructive dark:border-destructiveDark">
              <h3 className="text-md font-semibold text-destructive dark:text-destructiveDark mb-1">Erro ao Analisar</h3>
              <p className="text-sm text-textBase dark:text-textBaseDark">{advice.explanation || "Não foi possível obter a sugestão no momento."}</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm text-textMuted dark:text-textMutedDark">Melhor dia para sua próxima compra:</p>
                <p className="text-2xl font-bold text-primary dark:text-primaryDark my-1">{advice.bestPurchaseDay || 'N/A'}</p>
              </div>
              <div className="bg-primary/5 dark:bg-primaryDark/10 p-4 rounded-md">
                <p className="text-sm text-textMuted dark:text-textMutedDark">Pagamento estimado para:</p>
                <p className="text-lg font-semibold text-textBase dark:text-textBaseDark">{advice.paymentDueDate || 'N/A'}</p>
              </div>
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-1">Por quê?</h4>
                <p className="text-sm text-textBase dark:text-textBaseDark bg-surface p-3 rounded-md shadow-inner dark:bg-surfaceDark/50">
                  {advice.explanation || 'Informação não disponível.'}
                </p>
              </div>
            </>
          )}
          <div className="flex justify-end pt-3">
            <Button variant="primary" onClick={onClose}>Entendido</Button>
          </div>
        </div>
      )}
       {!isLoading && !advice && (
         <div className="text-center p-6">
            <p className="text-textMuted dark:text-textMutedDark">Não foi possível carregar a sugestão.</p>
             <Button variant="ghost" onClick={onClose} className="mt-4">Fechar</Button>
         </div>
       )}
    </Modal>
  );
};

export default BestPurchaseDayModal;