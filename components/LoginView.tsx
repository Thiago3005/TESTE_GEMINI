import React from 'react';
import Button from './Button';
import GoogleIcon from './icons/GoogleIcon'; // Assuming you have a GoogleIcon
import { APP_NAME } from '../constants';
import UserCircleIcon from './icons/UserCircleIcon';


interface LoginViewProps {
  onLoginWithGoogle: () => void;
  isLoading: boolean;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginWithGoogle, isLoading }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-backgroundDark p-4 text-textBase dark:text-textBaseDark">
      <div className="w-full max-w-sm bg-surface dark:bg-surfaceDark shadow-2xl rounded-xl p-8 space-y-8 text-center">
        <UserCircleIcon className="w-20 h-20 text-primary dark:text-primaryDark mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-textBase dark:text-textBaseDark">Bem-vindo ao {APP_NAME}</h1>
        <p className="text-textMuted dark:text-textMutedDark">
          Faça login com sua conta Google para acessar suas finanças.
        </p>
        <Button 
          variant="primary" 
          size="lg"
          className="w-full !py-3 flex items-center justify-center !bg-white !text-neutral-700 hover:!bg-gray-100 border border-gray-300 dark:!bg-slate-700 dark:!text-slate-200 dark:hover:!bg-slate-600 dark:border-slate-500"
          onClick={onLoginWithGoogle}
          disabled={isLoading}
        >
          <GoogleIcon className="w-5 h-5 mr-3" />
          {isLoading ? 'Conectando...' : 'Entrar com Google'}
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