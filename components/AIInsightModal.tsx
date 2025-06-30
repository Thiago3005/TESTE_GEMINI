
import React from 'react';
import { AIInsight, AIInsightType } from '../types';
import Modal from './Modal';
import Button from './Button';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import CalendarClockIcon from './icons/CalendarClockIcon';
import { formatDate } from '../utils/helpers';

interface AIInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: AIInsight | null;
}

const getInsightDisplayInfo = (type: AIInsightType): { icon: JSX.Element; title: string } => {
  switch (type) {
    case 'general_advice':
    case 'saving_opportunity_suggestion':
      return { icon: <LightBulbIcon className="w-8 h-8 text-yellow-500" />, title: 'Sugestão da IA' };
    case 'recurring_payment_candidate':
      return { icon: <ArrowPathIcon className="w-8 h-8 text-teal-500" />, title: 'Oportunidade de Automação' };
    case 'cash_flow_projection':
    case 'future_purchase_advice':
    case 'best_purchase_day_advice':
    case 'safe_to_spend_today_advice':
      return { icon: <CalendarClockIcon className="w-8 h-8 text-indigo-500" />, title: 'Análise Preditiva' };
    case 'budget_warning':
    case 'spending_anomaly_category':
    case 'budget_overspend_projection':
    case 'unusual_transaction_value':
    case 'debt_strategy_explanation':
    case 'debt_projection_summary':
    case 'debt_rate_analysis':
    case 'debt_viability_analysis':
      return { icon: <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />, title: 'Alerta Financeiro' };
    case 'error_message':
      return { icon: <ExclamationTriangleIcon className="w-8 h-8 text-destructive" />, title: 'Erro da IA' };
    default:
      return { icon: <ChatBubbleLeftRightIcon className="w-8 h-8 text-primary" />, title: 'Comentário da IA' };
  }
};

const AIInsightModal: React.FC<AIInsightModalProps> = ({ isOpen, onClose, insight }) => {
  if (!isOpen || !insight) return null;

  const { icon, title } = getInsightDisplayInfo(insight.type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="flex flex-col items-center text-center p-4">
        <div className="mb-4">{icon}</div>
        <div className="whitespace-pre-wrap text-textBase dark:text-textBaseDark mb-4">
          {insight.content}
        </div>
        <p className="text-xs text-textMuted dark:text-textMutedDark mb-6">
          {formatDate(insight.timestamp, 'pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>
        <Button variant="primary" onClick={onClose}>
          Entendido
        </Button>
      </div>
    </Modal>
  );
};

export default AIInsightModal;