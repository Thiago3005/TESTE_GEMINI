
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, error, className, containerClassName, ...props }) => {
  const baseStyle = "block w-full px-3 py-2 text-textBase bg-surface border border-borderBase rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:bg-neutral/10 dark:text-textBaseDark dark:bg-surfaceDark dark:border-borderBaseDark dark:focus:ring-primaryDark dark:focus:border-primaryDark dark:disabled:bg-neutralDark/20 dark:placeholder-textMutedDark/60";
  const errorStyle = "border-destructive dark:border-destructiveDark focus:ring-destructive dark:focus:ring-destructiveDark focus:border-destructive dark:focus:border-destructiveDark";
  
  return (
    <div className={containerClassName}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-textMuted dark:text-textMutedDark mb-1">{label}</label>}
      <textarea
        id={id}
        className={`${baseStyle} ${error ? errorStyle : ''} ${className || ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-destructive dark:text-destructiveDark/90">{error}</p>}
    </div>
  );
};

export default Textarea;