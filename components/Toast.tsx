
import React from 'react';
import { ToastMessage } from '../types';
import CloseIcon from './icons/CloseIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';

interface ToastProps extends ToastMessage {
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onDismiss }) => {
  let bgColor = 'bg-primary dark:bg-primaryDark';
  let textColor = 'text-white';
  let IconComponent = InformationCircleIcon;

  switch (type) {
    case 'success':
      bgColor = 'bg-secondary dark:bg-secondaryDark';
      IconComponent = CheckCircleIcon;
      break;
    case 'warning':
      bgColor = 'bg-amber-500 dark:bg-amber-600';
      IconComponent = ExclamationTriangleIcon;
      break;
    case 'error':
      bgColor = 'bg-destructive dark:bg-destructiveDark';
      IconComponent = ExclamationTriangleIcon;
      break;
    case 'info':
    default:
      bgColor = 'bg-blue-500 dark:bg-blue-600'; // Adjusted info color
      IconComponent = InformationCircleIcon;
      break;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`relative flex items-start w-full max-w-sm p-4 rounded-lg shadow-2xl ${bgColor} ${textColor} transform transition-all duration-300 ease-in-out animate-fadeIn`}
    >
      <div className="flex-shrink-0 mr-3">
        <IconComponent className="w-6 h-6" />
      </div>
      <div className="flex-grow text-sm font-medium">
        {message}
      </div>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Fechar notificação"
        className={`ml-3 -mr-1 -my-1 p-1 rounded-md hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors`}
      >
        <CloseIcon className="w-5 h-5" />
      </button>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;
