
import React, { useState } from 'react';
import Input from './Input';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ label, id, error, className, containerClassName, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={containerClassName}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-textMuted dark:text-textMutedDark mb-1">{label}</label>}
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className={`${className || ''} pr-10`}
          error={error} // Pass error to Input to handle its display
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-textMuted dark:text-textMutedDark hover:text-textBase dark:hover:text-textBaseDark"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        >
          {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
      {/* Error is rendered by the Input component itself if error prop is passed */}
    </div>
  );
};

export default PasswordInput;
