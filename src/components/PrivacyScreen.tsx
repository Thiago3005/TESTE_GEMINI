
import React, { useEffect } from 'react';
import LockClosedIcon from './icons/LockClosedIcon';
import { APP_NAME } from '../constants'; 

interface PrivacyScreenProps {
  onDeactivate: () => void;
}

const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onDeactivate }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDeactivate();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDeactivate]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface dark:bg-surfaceDark text-textBase dark:text-textBaseDark cursor-pointer transition-opacity duration-300 ease-in-out"
      onClick={onDeactivate}
      role="dialog"
      aria-modal="true"
      aria-label="Modo de Privacidade Ativado"
    >
      <div className="text-center p-8 rounded-lg">
        <LockClosedIcon className="w-16 h-16 text-primary dark:text-primaryDark mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-2">{APP_NAME}</h1>
        <p className="text-xl text-textMuted dark:text-textMutedDark mb-4">Modo de Privacidade Ativado</p>
        <p className="text-sm text-textMuted dark:text-textMutedDark">Clique em qualquer lugar ou pressione 'Esc' para continuar.</p>
      </div>
    </div>
  );
};

export default PrivacyScreen;
