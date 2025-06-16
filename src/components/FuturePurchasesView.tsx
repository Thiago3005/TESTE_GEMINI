
import React from 'react';
import { useState, useMemo } from 'react';
import { FuturePurchase, FuturePurchasePriority, FuturePurchaseStatus } from '../types';
import FuturePurchaseItem from './FuturePurchaseItem';
import FuturePurchaseFormModal from './FuturePurchaseFormModal';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import ShoppingCartIcon from './icons/ShoppingCartIcon';
import Select from './Select'; // For filtering

interface FuturePurchasesViewProps {
  futurePurchases: FuturePurchase[];
  onAddFuturePurchase: (purchase: Omit<FuturePurchase, 'status' | 'aiAnalysis' | 'aiAnalyzedAt'>) => void;
  onUpdateFuturePurchase: (purchase: Omit<FuturePurchase, 'status' | 'aiAnalysis' | 'aiAnalyzedAt'>) => void;
  onDeleteFuturePurchase: (purchaseId: string) => void;
  onAnalyzeFuturePurchase: (purchaseId: string) => void;
}

const priorityFilterOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas Prioridades' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

const statusFilterOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos Status' },
  { value: 'PLANNED', label: 'Planejado' },
  { value: 'CONSIDERING', label: 'Considerando' },
  { value: 'ACHIEVABLE_SOON', label: 'Viável em Breve' },
  { value: 'NOT_RECOMMENDED_NOW', label: 'Adiar Compra' },
  { value: 'AI_ANALYZING', label: 'Analisando' },
];


const FuturePurchasesView: React.FC<FuturePurchasesViewProps> = ({
  futurePurchases,
  onAddFuturePurchase,
  onUpdateFuturePurchase,
  onDeleteFuturePurchase,
  onAnalyzeFuturePurchase,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<FuturePurchase | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'cost_desc' | 'cost_asc' | 'date_desc' | 'date_asc'>('date_desc');


  const openModalForNew = () => {
    setEditingPurchase(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (purchase: FuturePurchase) => {
    setEditingPurchase(purchase);
    setIsModalOpen(true);
  };
  
  const filteredAndSortedPurchases = useMemo(() => {
    let items = [...futurePurchases];
    if (filterPriority !== 'all') {
      items = items.filter(p => p.priority === filterPriority);
    }
    if (filterStatus !== 'all') {
      items = items.filter(p => p.status === filterStatus);
    }

    items.sort((a, b) => {
      switch (sortOrder) {
        case 'cost_desc': return b.estimatedCost - a.estimatedCost;
        case 'cost_asc': return a.estimatedCost - b.estimatedCost;
        case 'date_asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return items;
  }, [futurePurchases, filterPriority, filterStatus, sortOrder]);


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <ShoppingCartIcon className="w-8 h-8 text-primary dark:text-primaryDark" />
          <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Compras Futuras & Objetivos</h1>
        </div>
        <Button onClick={openModalForNew} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Adicionar Compra Desejada
        </Button>
      </div>
      
      {/* Filters and Sort */}
      {futurePurchases.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-surface dark:bg-surfaceDark rounded-lg shadow dark:shadow-neutralDark/30">
          <Select label="Filtrar por Prioridade" options={priorityFilterOptions} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} />
          <Select label="Filtrar por Status" options={statusFilterOptions} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} />
          <Select 
            label="Ordenar Por" 
            options={[
                {value: 'date_desc', label: 'Mais Recentes Primeiro'},
                {value: 'date_asc', label: 'Mais Antigos Primeiro'},
                {value: 'cost_desc', label: 'Maior Custo'},
                {value: 'cost_asc', label: 'Menor Custo'},
            ]}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
           />
        </div>
      )}


      {filteredAndSortedPurchases.length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedPurchases.map(purchase => (
            <FuturePurchaseItem
              key={purchase.id}
              purchase={purchase}
              onEdit={openModalForEdit}
              onDelete={onDeleteFuturePurchase}
              onAnalyze={onAnalyzeFuturePurchase}
            />
          ))}
        </ul>
      ) : (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">
          {futurePurchases.length === 0 ? "Nenhuma compra futura planejada. Adicione uma para começar!" : "Nenhuma compra encontrada com os filtros aplicados."}
        </p>
      )}

      <FuturePurchaseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={editingPurchase ? onUpdateFuturePurchase : onAddFuturePurchase}
        existingPurchase={editingPurchase}
      />
    </div>
  );
};

export default FuturePurchasesView;
