import React from 'react';
import { FuturePurchase, FuturePurchaseStatus, FuturePurchasePriority } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import LightBulbIcon from './icons/LightBulbIcon'; // For AI analysis button
import ShoppingCartIcon from './icons/ShoppingCartIcon';

interface FuturePurchaseItemProps {
  purchase: FuturePurchase;
  onEdit: (purchase: FuturePurchase) => void;
  onDelete: (purchaseId: string) => void;
  onAnalyze: (purchaseId: string) => void;
}

const getStatusInfo = (status: FuturePurchaseStatus): { text: string; colorClasses: string; icon?: JSX.Element } => {
  switch (status) {
    case 'PLANNED':
      return { text: 'Planejado', colorClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300' };
    case 'CONSIDERING':
      return { text: 'Considerando', colorClasses: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300' };
    case 'ACHIEVABLE_SOON':
      return { text: 'Viável em Breve', colorClasses: 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' };
    case 'NOT_RECOMMENDED_NOW':
      return { text: 'Adiar Compra', colorClasses: 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300' };
    case 'AI_ANALYZING':
      return { text: 'Analisando...', colorClasses: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 animate-pulse' };
    default:
      return { text: 'Desconhecido', colorClasses: 'bg-gray-200 text-gray-800' };
  }
};

const priorityText: Record<FuturePurchasePriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

const FuturePurchaseItem: React.FC<FuturePurchaseItemProps> = ({ purchase, onEdit, onDelete, onAnalyze }) => {
  const { name, estimatedCost, priority, notes, status, createdAt, aiAnalysis, aiAnalyzedAt } = purchase;
  const statusInfo = getStatusInfo(status);

  return (
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 flex flex-col space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <div className="flex items-center space-x-2 mb-1">
            <ShoppingCartIcon className="w-5 h-5 text-primary dark:text-primaryDark flex-shrink-0" />
            <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">{name}</h3>
          </div>
          <p className="text-xl font-bold text-primary dark:text-primaryDark">{formatCurrency(estimatedCost)}</p>
          <div className="flex items-center space-x-2 text-xs text-textMuted dark:text-textMutedDark mt-0.5">
            <span>Prioridade: {priorityText[priority]}</span>
            <span>&bull;</span>
            <span>Criado em: {formatDate(createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusInfo.colorClasses}`}>
            {statusInfo.text}
          </span>
          <div className="flex space-x-1 mt-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(purchase)} aria-label="Editar Compra Futura" className="!p-1.5">
              <EditIcon className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(purchase.id)} aria-label="Excluir Compra Futura" className="!p-1.5">
              <TrashIcon className="w-4 h-4 text-destructive dark:text-destructiveDark" />
            </Button>
          </div>
        </div>
      </div>

      {notes && (
        <p className="text-sm text-textMuted dark:text-textMutedDark italic border-t border-borderBase/30 dark:border-borderBaseDark/30 pt-2 mt-2">
          Notas: {notes}
        </p>
      )}

      {aiAnalysis && (
        <div className="bg-primary/5 dark:bg-primaryDark/10 p-3 rounded-md mt-2 border-l-4 border-primary dark:border-primaryDark">
          <p className="text-sm font-semibold text-primary dark:text-primaryDark mb-1">Análise da IA ({aiAnalyzedAt ? formatDate(aiAnalyzedAt, 'pt-BR', {day: '2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Recente'}):</p>
          <p className="text-sm text-textBase dark:text-textBaseDark">{aiAnalysis}</p>
        </div>
      )}
      
      <div className="pt-2 border-t border-borderBase/30 dark:border-borderBaseDark/30 mt-auto">
        <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => onAnalyze(purchase.id)} 
            disabled={status === 'AI_ANALYZING'}
            className="w-full sm:w-auto"
        >
          <LightBulbIcon className="w-4 h-4 mr-1.5" />
          {status === 'AI_ANALYZING' ? 'Analisando...' : 'Analisar com IA'}
        </Button>
      </div>
    </li>
  );
};

export default FuturePurchaseItem;