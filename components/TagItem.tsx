import React from 'react';
import { Tag } from '../types';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';

interface TagItemProps {
  tag: Tag;
  transactionCount: number;
  onEdit: (tag: Tag) => void;
  onDelete: (tagId: string) => void;
}

const TagItem: React.FC<TagItemProps> = ({ tag, transactionCount, onEdit, onDelete }) => {
  const tagStyle: React.CSSProperties = tag.color
    ? { backgroundColor: tag.color, color: '#fff', borderColor: tag.color } // Assuming light text on colored background
    : { backgroundColor: 'transparent' }; // Default Tailwind styling will apply for text

  const textColorClass = tag.color ? 'text-white' : 'text-textBase dark:text-textBaseDark';
  const tagClasses = `text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full inline-block border
    ${tag.color ? '' : 'bg-neutral/10 dark:bg-neutralDark/20 border-neutral/30 dark:border-neutralDark/40'}`;


  // Basic function to determine if a color is light or dark
  // This helps in setting text color for good contrast
  const getContrastTextColor = (hexColor?: string): string => {
    if (!hexColor) return 'text-textBase dark:text-textBaseDark';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'text-neutral-800' : 'text-white';
  };
  
  const dynamicTextColorClass = getContrastTextColor(tag.color);


  return (
    <li className="bg-surface dark:bg-surfaceDark p-3 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150 flex justify-between items-center">
      <div className="flex items-center">
        <span 
            className={`text-xs font-semibold mr-3 px-2.5 py-1 rounded-full inline-block border
                        ${tag.color ? '' : 'bg-neutral/10 dark:bg-neutralDark/20 border-neutral/30 dark:border-neutralDark/40'}`}
            style={tag.color ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
        >
            <span className={tag.color ? dynamicTextColorClass : 'text-textBase dark:text-textBaseDark'}>
                {tag.name}
            </span>
        </span>
      </div>
      <div className="flex items-center space-x-1">
        {transactionCount > 0 && (
          <span className="text-xs text-textMuted dark:text-textMutedDark mr-2">({transactionCount} trans.)</span>
        )}
        <Button variant="ghost" size="sm" onClick={() => onEdit(tag)} aria-label="Editar Tag" className="!p-1.5">
          <EditIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(tag.id)}
          aria-label="Excluir Tag"
          className="!p-1.5"
          disabled={transactionCount > 0}
          title={transactionCount > 0 ? "Não é possível excluir tags em uso" : "Excluir Tag"}
        >
          <TrashIcon className={`w-4 h-4 ${transactionCount > 0 ? 'text-neutral/50 dark:text-neutralDark/50' : 'text-destructive dark:text-destructiveDark'}`} />
        </Button>
      </div>
    </li>
  );
};

export default TagItem;