
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}) => {
  const baseStyle = "font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-backgroundDark transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";
  
  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = 'bg-primary text-white hover:bg-blue-700 dark:bg-primaryDark dark:hover:bg-blue-600 focus:ring-primary dark:focus:ring-primaryDark';
      break;
    case 'secondary':
      variantStyle = 'bg-secondary text-white hover:bg-emerald-700 dark:bg-secondaryDark dark:hover:bg-emerald-600 focus:ring-secondary dark:focus:ring-secondaryDark';
      break;
    case 'danger':
      variantStyle = 'bg-destructive text-white hover:bg-red-700 dark:bg-destructiveDark dark:hover:bg-red-600 focus:ring-destructive dark:focus:ring-destructiveDark';
      break;
    case 'ghost':
      variantStyle = 'bg-transparent text-textBase dark:text-textBaseDark hover:bg-neutral/10 dark:hover:bg-neutralDark/20 focus:ring-neutral dark:focus:ring-neutralDark';
      break;
  }

  let sizeStyle = '';
  switch (size) {
    case 'sm':
      sizeStyle = 'px-3 py-1.5 text-sm';
      break;
    case 'md':
      sizeStyle = 'px-4 py-2 text-base';
      break;
    case 'lg':
      sizeStyle = 'px-6 py-3 text-lg';
      break;
  }

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;