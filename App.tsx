import React from 'react';
import { useState, useEffect, useCallback }from 'react';
import { supabase } from './services/supabaseClient';
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

import { Theme } from './types'; // Keep Theme type if still used for a global theme setting
import { APP_NAME } from './constants';

import { ToastProvider, useToasts } from './contexts/ToastContext';
import LoginView from './components/LoginView'; // Main view for now

// Minimal necessary imports
// import ThemeSwitcher from './components/ThemeSwitcher'; // Could be added to LoginView or a minimal Navbar if needed later

const AppContent: React.FC = () => {
  const { addToast } = useToasts();

  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authProcessIsLoading, setAuthProcessIsLoading] = useState(false); // Unified loading state for all auth ops
  const [authError, setAuthError] = useState<string | null>(null); // For login errors

  // Theme state can be simplified or removed if login is always dark
  const [theme, setThemeState] = useState<Theme>('dark'); 

  useEffect(() => {
    setIsLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (_event === 'SIGNED_IN') {
          addToast("Login bem-sucedido!", 'success');
          // Here you would typically navigate to the main app dashboard
          // For now, it will just re-render App.tsx, which will show "Logged in" or a placeholder
        } else if (_event === 'SIGNED_OUT') {
          addToast("Você foi desconectado.", 'info');
        } else if (_event === 'PASSWORD_RECOVERY') {
          addToast("Instruções de recuperação de senha enviadas para seu e-mail.", 'info');
        } else if (_event === 'USER_UPDATED') {
            // This event fires after a password reset via link is completed
            addToast("Senha atualizada com sucesso!", "success");
        }
        setIsLoadingSession(false);
        setAuthProcessIsLoading(false); // Ensure loading is stopped after auth state changes
      }
    );
    return () => subscription.unsubscribe();
  }, [addToast]);

  // Apply theme to document (simplified)
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const handleSignInWithGoogle = async () => {
    setAuthProcessIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + import.meta.env.BASE_URL, 
        },
      });
      if (error) throw error;
      // Supabase handles the redirect. onAuthStateChange will pick up the new session.
      // setAuthProcessIsLoading(false) is not strictly needed here due to redirect, 
      // but good practice if error occurs before redirect.
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      const message = error.message || "Falha ao fazer login com Google.";
      setAuthError(message);
      addToast(message, 'error');
      setAuthProcessIsLoading(false);
    }
  };

  const handleSignInWithEmail = async (email?: string, password?: string) => {
    setAuthProcessIsLoading(true);
    setAuthError(null);
    if (!email || !password) {
      const message = "E-mail e senha são obrigatórios.";
      setAuthError(message);
      addToast(message, 'error');
      setAuthProcessIsLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will handle success toast and user state
    } catch (error: any) {
      console.error("Error signing in with email:", error);
      let message = "Falha ao fazer login. Verifique suas credenciais.";
      if (error.message.includes("Invalid login credentials")) {
        message = "E-mail ou senha inválidos.";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
      }
      setAuthError(message);
      addToast(message, 'error');
    } finally {
      setAuthProcessIsLoading(false);
    }
  };

  const handleSignUp = async (email?: string, password?: string) => {
    setAuthProcessIsLoading(true);
    setAuthError(null);
     if (!email || !password) {
      const message = "E-mail e senha são obrigatórios para o cadastro.";
      setAuthError(message);
      addToast(message, 'error');
      setAuthProcessIsLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
           emailRedirectTo: window.location.origin + import.meta.env.BASE_URL 
        }
      });
      if (error) throw error;
      addToast("Cadastro realizado! Verifique seu e-mail para confirmação.", 'success');
    } catch (error: any) {
      console.error("Error signing up:", error);
      let message = "Falha ao realizar cadastro.";
      if (error.message.includes("User already registered")) {
        message = "Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.";
      } else if (error.message.includes("Password should be at least 6 characters")) {
        message = "A senha deve ter pelo menos 6 caracteres.";
      }
      setAuthError(message);
      addToast(message, 'error');
    } finally {
      setAuthProcessIsLoading(false);
    }
  };

  const handleForgotPassword = async (email?: string) => {
     setAuthProcessIsLoading(true);
     setAuthError(null);
     if (!email) {
      const message = "E-mail é obrigatório para recuperar a senha.";
      setAuthError(message);
      addToast(message, 'error');
      setAuthProcessIsLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + import.meta.env.BASE_URL, // User will be redirected here after clicking the link
      });
      if (error) throw error;
      // Toast will be shown by onAuthStateChange listener for 'PASSWORD_RECOVERY'
      // addToast("Instruções de recuperação de senha enviadas para seu e-mail.", 'info');
    } catch (error: any) {
      console.error("Error on forgot password:", error);
      const message = error.message || "Falha ao enviar e-mail de recuperação.";
      setAuthError(message);
      addToast(message, 'error');
    } finally {
      setAuthProcessIsLoading(false);
    }
  };


  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-backgroundDark text-textBaseDark">
        Carregando...
      </div>
    );
  }

  if (user) {
    // User is logged in.
    // For now, just show a message. Later, this would render the main app.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-backgroundDark text-textBaseDark p-4">
        <h1 className="text-2xl mb-4">Bem-vindo, {user.email}!</h1>
        <p className="mb-6">Você está logado.</p>
        <button 
          onClick={async () => {
            setAuthProcessIsLoading(true);
            await supabase.auth.signOut();
            setAuthProcessIsLoading(false);
          }}
          disabled={authProcessIsLoading}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50"
        >
          {authProcessIsLoading ? 'Saindo...' : 'Sair'}
        </button>
      </div>
    );
  }

  return (
    <LoginView 
      onLoginWithGoogle={handleSignInWithGoogle} 
      onLoginWithEmail={handleSignInWithEmail}
      onSignUp={handleSignUp}
      onForgotPassword={handleForgotPassword}
      isLoading={authProcessIsLoading} 
      authError={authError}
    />
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;