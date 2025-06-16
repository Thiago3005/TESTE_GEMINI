import React from 'react';
import { useState } from 'react';
import { UserProfile } from '../types';
import Button from './Button';
import Input from './Input';
import { APP_NAME } from '../constants';
import UserCircleIcon from './icons/UserCircleIcon';

interface ProfileSelectionViewProps {
  profiles: UserProfile[];
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string) => void;
}

const ProfileSelectionView: React.FC<ProfileSelectionViewProps> = ({
  profiles,
  onSelectProfile,
  onCreateProfile,
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!newProfileName.trim()) {
      setError('O nome do perfil não pode ser vazio.');
      return;
    }
    if (profiles.some(p => p.name.toLowerCase() === newProfileName.trim().toLowerCase())) {
      setError('Já existe um perfil com este nome.');
      return;
    }
    setError('');
    onCreateProfile(newProfileName.trim());
    setNewProfileName('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-backgroundDark p-4 text-textBase dark:text-textBaseDark">
      <div className="w-full max-w-md bg-surface dark:bg-surfaceDark shadow-2xl rounded-xl p-8 space-y-8">
        <div className="text-center">
          <UserCircleIcon className="w-16 h-16 text-primary dark:text-primaryDark mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-textBase dark:text-textBaseDark">Bem-vindo ao {APP_NAME}</h1>
          <p className="text-textMuted dark:text-textMutedDark mt-2">Selecione um perfil ou crie um novo para começar.</p>
        </div>

        {profiles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-textBase dark:text-textBaseDark border-b border-borderBase dark:border-borderBaseDark pb-2">Selecionar Perfil Existente</h2>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {profiles.map((profile) => (
                <li key={profile.id}>
                  <Button
                    variant="ghost"
                    className="w-full !justify-start text-left !py-3 !px-4 hover:!bg-primary/10 dark:hover:!bg-primaryDark/10"
                    onClick={() => onSelectProfile(profile.id)}
                  >
                    <UserCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                    {profile.name}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
           <h2 className="text-lg font-semibold text-textBase dark:text-textBaseDark border-b border-borderBase dark:border-borderBaseDark pb-2">
            {profiles.length > 0 ? 'Ou Crie um Novo Perfil' : 'Crie seu Primeiro Perfil'}
          </h2>
          <Input
            id="newProfileName"
            label="Nome do Novo Perfil"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Ex: Finanças Pessoais, Meu Negócio"
            error={error}
          />
          <Button variant="primary" onClick={handleCreate} className="w-full !py-3">
            Criar e Usar Perfil
          </Button>
        </div>
      </div>
       <footer className="mt-8 text-center text-xs text-textMuted dark:text-textMutedDark">
            <p>&copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.</p>
        </footer>
    </div>
  );
};

export default ProfileSelectionView;