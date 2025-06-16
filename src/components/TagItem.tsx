import React from 'react';
import { Tag } from '../types';
import Button from './Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import TagIcon from './icons/TagIcon';

interface TagItemProps {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (id: string) => void;
}

const TagItem: React.FC<TagItemProps> = ({ tag, onEdit, onDelete }) => {
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
    <li className="bg-surface dark:bg-surfaceDark p-4 rounded-lg shadow hover:shadow-md dark:shadow-neutralDark/30 dark:hover:shadow-neutralDark/50 transition-shadow duration-150">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex-grow">
          <div className="flex items-center space-x-3 mb-1">
            <TagIcon className="w-5 h-5 text-primary dark:text-primaryDark" />
            <h3 className="text-md font-medium text-textBase dark:text-textBaseDark">{tag.name}</h3>
          </div>
        </div>
        <div className="flex space-x-2 self-end sm:self-center">
          <Button variant="ghost" size="sm" onClick={() => onEdit(tag)} aria-label="Editar Tag">
            <EditIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(tag.id)} aria-label="Excluir Tag">
            <TrashIcon className="w-4 h-4 text-destructive dark:text-destructiveDark" />
          </Button>
        </div>
      </div>
    </li>
  );
};

export default TagItem;