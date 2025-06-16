
import React from 'react';
import { Theme } from '../types';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import ComputerDesktopIcon from './icons/ComputerDesktopIcon';
import Button from './Button'; // Assuming Button component can handle icon-only styles or needs adjustment

interface ThemeSwitcherProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, setTheme }) => {
  const themes: { name: Theme; label: string; icon: JSX.Element }[] = [
    { name: 'light', label: 'Claro', icon: <SunIcon className="w-4 h-4" /> },
    { name: 'dark', label: 'Escuro', icon: <MoonIcon className="w-4 h-4" /> },
    { name: 'system', label: 'Sistema', icon: <ComputerDesktopIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="p-2">
      <p className="text-xs text-textMuted dark:text-textMutedDark mb-1 px-1">Tema</p>
      <div className="flex items-center justify-around bg-neutral/10 dark:bg-neutralDark/20 rounded-md p-1">
        {themes.map((t) => (
          <Button
            key={t.name}
            variant="ghost"
            size="sm"
            onClick={() => setTheme(t.name)}
            className={`flex-1 !px-2 !py-1 text-xs transition-all duration-200 ease-in-out
                        ${theme === t.name 
                            ? '!bg-primary/20 dark:!bg-primaryDark/30 !text-primary dark:!text-primaryDark' 
                            : 'hover:!bg-neutral/20 dark:hover:!bg-neutralDark/30 !text-textMuted dark:!text-textMutedDark'
                        }`}
            title={`Mudar para tema ${t.label.toLowerCase()}`}
            aria-pressed={theme === t.name}
          >
            {React.cloneElement(t.icon, {className: "w-4 h-4 sm:mr-1"})}
            <span className="hidden sm:inline">{t.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;