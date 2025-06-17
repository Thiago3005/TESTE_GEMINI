
import React from 'react';
import { useState, useEffect } from 'react';
import { Tag } from '../types';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { generateId } from '../utils/helpers';

// Basic palette for tag colors
const TAG_COLORS = [
  "#F87171", // red-400
  "#FBBF24", // amber-400
  "#34D399", // emerald-400
  "#60A5FA", // blue-400
  "#A78BFA", // violet-400
  "#F472B6", // pink-400
  "#A3A3A3", // neutral-400
];

interface TagFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tag: Omit<Tag, 'user_id' | 'created_at' | 'updated_at'>) => void;
  existingTag?: Tag | null;
  allTagNames?: string[]; // To check for uniqueness if needed
}

const TagFormModal: React.FC<TagFormModalProps> = ({ isOpen, onClose, onSave, existingTag, allTagNames = [] }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingTag) {
        setName(existingTag.name);
        setColor(existingTag.color);
      } else {
        setName('');
        setColor(TAG_COLORS[0]); // Default to first color or undefined
      }
      setError('');
    }
  }, [existingTag, isOpen]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Nome da tag é obrigatório.');
      return;
    }
    // Check for uniqueness if it's a new tag or name changed
    const nameExists = allTagNames
        .filter(n => existingTag ? n.toLowerCase() !== existingTag.name.toLowerCase() : true)
        .includes(trimmedName.toLowerCase());

    if (nameExists) {
        setError('Já existe uma tag com este nome.');
        return;
    }

    setError('');
    onSave({
      id: existingTag?.id || generateId(),
      name: trimmedName,
      color: color,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingTag ? 'Editar Tag' : 'Nova Tag'}>
      <div className="space-y-4">
        <Input
          label="Nome da Tag"
          id="tagName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          placeholder="Ex: Viagem, Pessoal, Urgente"
        />
        <div>
          <label className="block text-sm font-medium text-textMuted dark:text-textMutedDark mb-1">Cor (Opcional)</label>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all
                            ${color === c 
                                ? 'ring-2 ring-offset-2 dark:ring-offset-surfaceDark border-primary dark:border-primaryDark ring-primary dark:ring-primaryDark' 
                                : 'border-transparent hover:border-neutral/50 dark:hover:border-neutralDark/50'
                            }`}
                style={{ backgroundColor: c }}
                aria-label={`Selecionar cor ${c}`}
                aria-pressed={color === c}
              />
            ))}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setColor(undefined)}
                className={`h-7 px-2 ${!color ? 'bg-neutral/20 dark:bg-neutralDark/30' : ''}`}
                title="Remover cor"
            >
                Sem Cor
            </Button>
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>Salvar</Button>
        </div>
      </div>
    </Modal>
  );
};

export default TagFormModal;