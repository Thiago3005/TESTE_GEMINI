import React, { useState } from 'react';
import Button from './Button';
import CopyIcon from './icons/CopyIcon'; // Import the new icon
import { useToasts } from '../contexts/ToastContext'; // Import useToasts

// Path to the QR code image, including the base URL for GitHub Pages
const qrCodeImagePath = import.meta.env.BASE_URL + 'assets/qrcode-pix.png';
const pixKeyValue = "00020126470014br.gov.bcb.pix0125thiaguiinho3005@gmail.com5204000053039865802BR5923thiago augusto da silva6009Itabirito62180514TX67lsyfc8255663041F05";

const AjudeProjetoView: React.FC = () => {
  const [showQr, setShowQr] = useState(true);
  const { addToast } = useToasts(); // Get addToast function

  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(pixKeyValue);
      addToast('Chave PIX copiada!', 'success');
    } catch (err) {
      console.error('Falha ao copiar a chave PIX: ', err);
      addToast('Falha ao copiar chave PIX.', 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 flex flex-col items-center text-center max-w-2xl mx-auto h-full">
      <div className="flex-grow flex flex-col items-center justify-center w-full">
        <h1 className="text-3xl font-bold text-textBase dark:text-textBaseDark mb-8">Ajude o Projeto</h1>
        
        <div className="bg-surface dark:bg-surfaceDark p-6 md:p-8 rounded-xl shadow-xl w-full dark:shadow-neutralDark/40">
          <p className="text-textMuted dark:text-textMutedDark mb-6 text-base leading-relaxed">
            Para o projeto continuar evoluindo e mantendo recursos como a Inteligência Artificial (que possui custos associados), sua contribuição é muito valiosa!
          </p>

          {showQr && (
            <div className="my-6 flex flex-col items-center animate-fadeIn">
              <img 
                src={qrCodeImagePath} 
                alt="QR Code PIX para doação" 
                className="w-52 h-52 md:w-60 md:h-60 object-contain rounded-lg border-2 border-primary dark:border-primaryDark shadow-lg" 
              />
              <p className="mt-4 text-sm text-textMuted dark:text-textMutedDark">
                Escaneie com seu app bancário e me ajude a comprar um café ☕
              </p>
            </div>
          )}

          <Button 
            variant="ghost" 
            onClick={() => setShowQr(!showQr)}
            className="text-primary dark:text-primaryDark hover:underline mb-6 text-sm"
            aria-live="polite"
          >
            {showQr ? 'Esconder QR Code' : 'Mostrar QR Code para PIX'}
          </Button>

          <div className="my-6 animate-fadeIn">
            <p className="text-sm font-semibold text-textMuted dark:text-textMutedDark mb-2">Chave PIX Copia e Cola:</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md shadow-inner break-all text-left text-xs text-textBase dark:text-textBaseDark mb-3">
              <code>{pixKeyValue}</code>
            </div>
            <Button onClick={handleCopyPixKey} variant="secondary" size="sm">
              <CopyIcon className="w-4 h-4 mr-2" />
              Copiar Chave
            </Button>
          </div>
          
          <p className="text-sm text-textMuted dark:text-textMutedDark mt-6">
            Qualquer valor ajuda a manter o projeto vivo e com novas funcionalidades. Muito obrigado!
          </p>
        </div>
      </div>

      <footer className="py-6 text-sm text-textMuted dark:text-textMutedDark">
        Desenvolvido com <span role="img" aria-label="coração roxo" className="text-primary dark:text-primaryDark">💜</span> por{' '}
        <a 
          href="https://github.com/Thiago3005" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary dark:text-primaryDark hover:underline font-semibold"
        >
          @ThiagoAugusto
        </a>
      </footer>
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AjudeProjetoView;
