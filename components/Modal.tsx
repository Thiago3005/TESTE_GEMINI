
import React from 'react';
import CloseIcon from './icons/CloseIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  let sizeClasses = 'max-w-md'; // default md
  if (size === 'sm') sizeClasses = 'max-w-sm';
  if (size === 'lg') sizeClasses = 'max-w-lg';
  if (size === 'xl') sizeClasses = 'max-w-xl';
  if (size === '2xl') sizeClasses = 'max-w-2xl';


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 backdrop-blur-sm p-4">
      <div 
        className={`bg-surface dark:bg-surfaceDark rounded-lg shadow-xl dark:shadow-neutralDark/50 w-full ${sizeClasses} transform transition-all flex flex-col max-h-[85vh]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div id="modal-title" className="flex items-center justify-between px-6 py-4 border-b border-borderBase dark:border-borderBaseDark flex-shrink-0">
          <h3 className="text-lg font-semibold text-textBase dark:text-textBaseDark">{title}</h3>
          <button
            onClick={onClose}
            className="text-textMuted dark:text-textMutedDark hover:text-textBase dark:hover:text-textBaseDark transition-colors"
            aria-label="Fechar modal"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
