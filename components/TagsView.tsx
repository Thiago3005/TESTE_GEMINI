import React from 'react';
import { useState }from 'react';
import { Tag, Transaction } from '../types';
import TagItem from './TagItem';
import TagFormModal from './TagFormModal';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';

interface TagsViewProps {
  tags: Tag[];
  transactions: Transaction[];
  onAddTag: (tag: Tag) => void;
  onUpdateTag: (tag: Tag) => void;
  onDeleteTag: (tagId: string) => void;
}

const TagsView: React.FC<TagsViewProps> = ({ tags, transactions, onAddTag, onUpdateTag, onDeleteTag }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const openModalForNew = () => {
    setEditingTag(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsModalOpen(true);
  };

  const getTransactionCountForTag = (tagId: string): number => {
    return transactions.filter(t => t.tagIds?.includes(tagId)).length;
  };
  
  const allTagNames = tags.map(t => t.name);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Tags</h1>
        <Button onClick={openModalForNew} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Tag
        </Button>
      </div>

      {tags.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tags.map(tag => (
            <TagItem
              key={tag.id}
              tag={tag}
              transactionCount={getTransactionCountForTag(tag.id)}
              onEdit={openModalForEdit}
              onDelete={onDeleteTag}
            />
          ))}
        </ul>
      ) : (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma tag cadastrada. Crie tags para organizar melhor suas transações!</p>
      )}

      <TagFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={editingTag ? onUpdateTag : onAddTag}
        existingTag={editingTag}
        allTagNames={allTagNames}
      />
    </div>
  );
};

export default TagsView;