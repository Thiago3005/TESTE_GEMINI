
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import PasswordInput from './PasswordInput';
import Button from './Button';
import { AuthModalType } from '../types';
import { APP_NAME } from '../constants';
import UserCircleIcon from './icons/UserCircleIcon';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: Exclude<AuthModalType, 'none'>; // Ensures initialMode is always an active mode
  onClose: () => void;
  onSetMode: (mode: AuthModalType) => void;
  onSignUp: (fullName: string, email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onResetPassword: (password: string) => Promise<void>;
  authError: string | null;
  isLoading: boolean;
  clearAuthError: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSetMode,
  onSignUp,
  onForgotPassword,
  onResetPassword,
  authError,
  isLoading,
  clearAuthError,
}) => {
  const [mode, setMode] = useState<Exclude<AuthModalType, 'none'>>(initialMode);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    // Clear form fields and errors when modal opens or mode changes
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
    setSuccessMessage(null);
    clearAuthError(); // Clear global auth error when modal opens with an active mode
  }, [isOpen, initialMode, clearAuthError]);

  const handleClose = () => {
    onClose();
    // Reset mode to none if it was part of a flow like resetPassword by calling parent's setter
    if (mode === 'resetPassword') {
        onSetMode('none');
    }
  }

  const validateSignUp = () => {
    if (!fullName.trim()) { setFormError("Nome completo é obrigatório."); return false; }
    if (!email.trim()) { setFormError("Email é obrigatório."); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setFormError("Formato de email inválido."); return false; }
    if (password.length < 6) { setFormError("Senha deve ter no mínimo 6 caracteres."); return false; }
    if (password !== confirmPassword) { setFormError("As senhas não coincidem."); return false; }
    setFormError(null);
    return true;
  };

  const validateForgotPassword = () => {
    if (!email.trim()) { setFormError("Email é obrigatório."); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setFormError("Formato de email inválido."); return false; }
    setFormError(null);
    return true;
  };
  
  const validateResetPassword = () => {
    if (password.length < 6) { setFormError("Nova senha deve ter no mínimo 6 caracteres."); return false; }
    if (password !== confirmPassword) { setFormError("As senhas não coincidem."); return false; }
    setFormError(null);
    return true;
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    clearAuthError();
    if (!validateSignUp()) return;
    try {
      await onSignUp(fullName, email, password);
      setSuccessMessage("Cadastro realizado! Verifique seu e-mail para confirmar sua conta, se necessário. Você pode tentar fazer login agora.");
      // Optionally switch to login or close modal after a delay
    } catch (error) {
      // Error handled by authError prop
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    clearAuthError();
    if (!validateForgotPassword()) return;
    try {
      await onForgotPassword(email);
      setSuccessMessage("Link de recuperação enviado! Verifique seu e-mail (incluindo spam).");
    } catch (error) {
      // Error handled by authError prop
    }
  };
  
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    clearAuthError();
    if (!validateResetPassword()) return;
    try {
      await onResetPassword(password);
      setSuccessMessage("Senha alterada com sucesso! Você já pode fazer login com sua nova senha.");
      setTimeout(() => {
        handleClose(); // Close modal and trigger parent's onSetMode('none') if applicable
      }, 3000);
    } catch (error) {
       // Error handled by authError prop
    }
  };


  let modalTitle = '';
  let content = null;

  // No 'none' case here as 'mode' state is Exclude<AuthModalType, 'none'>
  switch (mode) {
    case 'signup':
      modalTitle = 'Criar Nova Conta';
      content = (
        <form onSubmit={handleSignUpSubmit} className="space-y-4">
          <Input label="Nome Completo" id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <PasswordInput label="Senha" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <PasswordInput label="Confirmar Senha" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          {formError && <p className="text-sm text-destructive dark:text-destructiveDark">{formError}</p>}
          {authError && <p className="text-sm text-destructive dark:text-destructiveDark">{authError}</p>}
          {successMessage && <p className="text-sm text-secondary dark:text-secondaryDark">{successMessage}</p>}
          <Button type="submit" variant="primary" className="w-full !py-2.5" disabled={isLoading}>
            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
          <p className="text-center text-sm">
            Já tem uma conta?{' '}
            <button type="button" onClick={() => { clearAuthError(); onSetMode('none'); onClose(); }} className="font-medium text-primary dark:text-primaryDark hover:underline">
              Faça Login
            </button>
          </p>
        </form>
      );
      break;
    case 'forgotPassword':
      modalTitle = 'Recuperar Senha';
      content = (
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <p className="text-sm text-textMuted dark:text-textMutedDark">
            Informe seu email e enviaremos um link para você cadastrar uma nova senha.
          </p>
          <Input label="Email" id="email-forgot" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {formError && <p className="text-sm text-destructive dark:text-destructiveDark">{formError}</p>}
          {authError && <p className="text-sm text-destructive dark:text-destructiveDark">{authError}</p>}
          {successMessage && <p className="text-sm text-secondary dark:text-secondaryDark">{successMessage}</p>}
          <Button type="submit" variant="primary" className="w-full !py-2.5" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </Button>
          <p className="text-center text-sm">
            Lembrou a senha?{' '}
            <button type="button" onClick={() => { clearAuthError(); onSetMode('none'); onClose(); }} className="font-medium text-primary dark:text-primaryDark hover:underline">
              Voltar para Login
            </button>
          </p>
        </form>
      );
      break;
    case 'resetPassword':
        modalTitle = 'Definir Nova Senha';
        content = (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <p className="text-sm text-textMuted dark:text-textMutedDark">
                Crie uma nova senha para sua conta.
            </p>
            <PasswordInput label="Nova Senha" id="newPassword" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <PasswordInput label="Confirmar Nova Senha" id="confirmNewPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            {formError && <p className="text-sm text-destructive dark:text-destructiveDark">{formError}</p>}
            {authError && <p className="text-sm text-destructive dark:text-destructiveDark">{authError}</p>}
            {successMessage && <p className="text-sm text-secondary dark:text-secondaryDark">{successMessage}</p>}
            <Button type="submit" variant="primary" className="w-full !py-2.5" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
            </form>
        );
        break;
  }

  if (!isOpen) return null; // Since mode is now Exclude<AuthModalType, 'none'>, mode === 'none' check is not needed.

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="md">
      <div className="flex flex-col items-center mb-6">
        <UserCircleIcon className="w-12 h-12 text-primary dark:text-primaryDark mb-2" />
        <p className="text-lg font-medium text-textMuted dark:text-textMutedDark"> {APP_NAME} </p>
      </div>
      {content}
    </Modal>
  );
};

export default AuthModal;
