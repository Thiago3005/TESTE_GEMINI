import React, { useState, ChangeEvent } from 'react';
import Button from './Button';
import Input from './Input';
import GoogleIcon from './icons/GoogleIcon';
import { APP_NAME } from '../constants'; 

interface LoginViewProps {
  onLoginWithGoogle: () => void;
  onLoginWithEmail: (email?: string, password?: string) => void;
  onSignUp: (email?: string, password?: string) => void;
  onForgotPassword: (email?: string) => void;
  isLoading: boolean;
  authError: string | null;
}

const LoginView: React.FC<LoginViewProps> = ({ 
  onLoginWithGoogle, 
  onLoginWithEmail,
  onSignUp,
  onForgotPassword,
  isLoading, 
  authError 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmitEmailPassword = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginWithEmail(email, password);
  };
  
  const handleSignUpClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Ensure email and password fields are not empty for sign-up context
    if (!email.trim() || !password.trim()) {
        // Optionally set an authError or use a toast
        // For now, we assume App.tsx handles validation if these are passed empty
    }
    onSignUp(email, password); 
  };

  const handleForgotPasswordClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Ensure email field is not empty for forgot password context
    if (!email.trim()) {
        // Optionally set an authError or use a toast
    }
    onForgotPassword(email); 
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Left Column: Form */}
      <div className="w-full md:w-1/2 bg-gray-950/70 backdrop-blur-lg border-r border-gray-800/50 flex flex-col justify-center items-center p-4 xs:p-6 sm:p-10 lg:p-12 order-2 md:order-1">
        <div className="w-full max-w-sm space-y-6 sm:space-y-7">
          <div className="text-left">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 py-1">
              {APP_NAME}
            </h1>
            <h2 className="mt-3 text-2xl font-semibold text-gray-100">
              Entrar
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Por favor, insira seus dados para continuar.
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/20 border border-red-600 text-red-300 px-4 py-2.5 rounded-md text-sm" role="alert">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmitEmailPassword} className="space-y-5">
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              label="E-mail"
              className="bg-gray-800/60 border-gray-700/80 focus:border-primaryDark focus:ring-primaryDark placeholder-textMutedDark/60 text-base py-2.5 shadow-sm"
            />
            <div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                label="Senha"
                className="bg-gray-800/60 border-gray-700/80 focus:border-primaryDark focus:ring-primaryDark placeholder-textMutedDark/60 text-base py-2.5 shadow-sm"
              />
              <div className="text-right mt-1.5">
                <a 
                  href="#" 
                  onClick={handleForgotPasswordClick}
                  className="text-xs sm:text-sm font-medium text-primary hover:text-blue-400 transition-colors"
                >
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full !py-2.5 sm:!py-3 text-base font-semibold shadow-lg hover:shadow-primary/40"
              disabled={isLoading && !authError?.includes('Google')}
            >
              {isLoading && !authError?.includes('Google') ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-700/60" />
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 bg-gray-950 text-textMutedDark">OU</span> 
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={onLoginWithGoogle}
            className="w-full !py-2.5 sm:!py-3 text-base !bg-white !text-neutral-700 hover:!bg-gray-100 border border-gray-300/80 font-medium shadow hover:shadow-md"
            disabled={isLoading && authError?.includes('Google')}
          >
            <GoogleIcon className="w-5 h-5 mr-2.5" />
            {isLoading && authError?.includes('Google') ? 'Conectando...' : 'Entrar com Google'}
          </Button>

          <p className="mt-6 text-center text-xs sm:text-sm text-textMutedDark">
            Não tem uma conta?{' '}
            <a href="#" onClick={handleSignUpClick} className="font-medium text-primary hover:text-blue-400 transition-colors">
              Cadastre-se
            </a>
          </p>
           <footer className="pt-5 text-center text-xs text-textMutedDark/70">
            <p>&copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.</p>
          </footer>
        </div>
      </div>

      {/* Right Column: Image Placeholder */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-gray-900/30 via-transparent to-blue-950/10 backdrop-blur-sm items-center justify-center p-8 lg:p-12 order-1 md:order-2">
        <div className="text-center">
          <div className="w-full h-64 lg:h-80 bg-gray-800/30 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-700/50 shadow-xl">
            <p className="text-xl font-semibold text-textMutedDark p-8">
              A imagem da sua aplicação aparecerá aqui.
            </p>
          </div>
           <p className="text-textMutedDark mt-4 text-sm">Visão geral elegante do seu app.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
