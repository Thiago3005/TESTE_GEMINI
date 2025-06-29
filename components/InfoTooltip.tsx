
import React from 'react';
import InformationCircleIcon from './icons/InformationCircleIcon';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, className }) => {
  return (
    <div className={`group relative inline-flex items-center ${className}`}>
      <InformationCircleIcon className="w-4 h-4 text-textMuted dark:text-textMutedDark cursor-help" />
      <div
        className="absolute bottom-full mb-2 w-64 p-2 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-md shadow-lg
                   opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10
                   left-1/2 -translate-x-1/2"
      >
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800 dark:border-t-slate-700"></div>
      </div>
    </div>
  );
};

export default InfoTooltip;
