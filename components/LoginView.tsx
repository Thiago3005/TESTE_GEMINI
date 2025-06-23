
import React, { useState } from 'react';
import Button from './Button';
import GoogleIcon from './icons/GoogleIcon';
import { APP_NAME } from '../constants';
import UserCircleIcon from './icons/UserCircleIcon';
import Input from './Input';
import PasswordInput from './PasswordInput';
import { AuthModalType } from '../types';

interface LoginViewProps {
  onLoginWithGoogle: () => void;
  onLoginWithEmail: (email: string, password: string) => Promise<void>;
  onOpenAuthModal: (mode: AuthModalType) => void;
  isLoadingGoogle: boolean;
  isLoadingEmail: boolean;
  authError: string | null;
  clearAuthError: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({
  onLoginWithGoogle,
  onLoginWithEmail,
  onOpenAuthModal,
  isLoadingGoogle,
  isLoadingEmail,
  authError,
  clearAuthError,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setFormError(null);
    if (!email.trim() || !password.trim()) {
      setFormError("Email e senha são obrigatórios.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        setFormError("Formato de email inválido.");
        return;
    }
    try {
        await onLoginWithEmail(email, password);
    } catch (error) {
        // authError prop will be set by App.tsx
    }
  };
  
  const handleInputChange = () => {
    clearAuthError();
    setFormError(null);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background dark:from-primaryDark/5 dark:via-backgroundDark dark:to-slate-950 p-4 text-textBase dark:text-textBaseDark">
      <div className="w-full max-w-md bg-surface dark:bg-surfaceDark shadow-2xl rounded-xl p-8 sm:p-10 space-y-6 text-center">
        <UserCircleIcon className="w-20 h-20 text-primary dark:text-primaryDark mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-textBase dark:text-textBaseDark">{APP_NAME}</h1>
        <p className="text-textMuted dark:text-textMutedDark mt-1 mb-6">Acesse sua conta para continuar.</p>
        
        <form onSubmit={handleEmailLogin} className="space-y-5 text-left">
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); handleInputChange(); }}
            placeholder="seu@email.com"
            required
          />
          <PasswordInput
            label="Senha"
            id="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); handleInputChange(); }}
            placeholder="Sua senha"
            required
          />
           {(formError || authError) && (
            <p className="text-xs text-destructive dark:text-destructiveDark/90 text-center py-1 mt-1">
                {formError || authError}
            </p>
           )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full !py-3"
            disabled={isLoadingEmail || isLoadingGoogle}
          >
            {isLoadingEmail ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="flex justify-between text-xs sm:text-sm">
          <button 
            onClick={() => { clearAuthError(); onOpenAuthModal('forgotPassword'); }} 
            className="font-medium text-primary dark:text-primaryDark hover:underline focus:outline-none"
          >
            Esqueceu sua senha?
          </button>
          <button 
            onClick={() => { clearAuthError(); onOpenAuthModal('signup'); }} 
            className="font-medium text-primary dark:text-primaryDark hover:underline focus:outline-none"
          >
            Não tem conta? Cadastre-se
          </button>
        </div>
        
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-borderBase dark:border-borderBaseDark"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold text-textMuted dark:text-textMutedDark uppercase">OU</span>
          <div className="flex-grow border-t border-borderBase dark:border-borderBaseDark"></div>
        </div>

        <Button 
          variant="ghost" 
          size="lg"
          className="w-full !py-3 flex items-center justify-center !bg-white !text-neutral-700 hover:!bg-gray-100 border border-gray-300 dark:!bg-slate-700 dark:!text-slate-200 dark:hover:!bg-slate-600 dark:border-slate-500"
          onClick={() => { clearAuthError(); onLoginWithGoogle(); }}
          disabled={isLoadingGoogle || isLoadingEmail}
        >
          <GoogleIcon className="w-5 h-5 mr-3" />
          {isLoadingGoogle ? 'Conectando...' : 'Entrar com Google'}
        </Button>
         <p className="text-xs text-textMuted dark:text-textMutedDark pt-4">
            Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade (simulados).
          </p>
      </div>
       <footer className="mt-8 text-center text-xs text-textMuted dark:text-textMutedDark">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LoginView;
