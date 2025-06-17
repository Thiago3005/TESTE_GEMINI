
import React from 'react'; 
import { useState }from 'react'; 
import { Account, Transaction } from '../types';
import { generateId, formatCurrency } from '../utils/helpers';
import AccountItem from './AccountItem';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';

interface AccountsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
  calculateAccountBalance: (accountId: string) => number;
  isPrivacyModeEnabled?: boolean; // New prop
}

const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  calculateAccountBalance,
  isPrivacyModeEnabled,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountName, setAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [formError, setFormError] = useState('');

  const openModalForNew = () => {
    setEditingAccount(null);
    setAccountName('');
    setInitialBalance('0');
    setFormError('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (account: Account) => {
    setEditingAccount(account);
    setAccountName(account.name);
    setInitialBalance(account.initial_balance.toString());
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleSaveAccount = () => {
    if (!accountName.trim()) {
      setFormError('Nome da conta é obrigatório.');
      return;
    }
    const balanceValue = parseFloat(initialBalance);
    if (isNaN(balanceValue)) {
        setFormError('Saldo inicial inválido.');
        return;
    }

    setFormError('');

    if (editingAccount) {
      onUpdateAccount({ ...editingAccount, name: accountName, initial_balance: balanceValue });
    } else {
      // Supabase handles id, user_id, created_at, updated_at
      onAddAccount({ name: accountName, initial_balance: balanceValue } as Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
    }
    closeModal();
  };
  
  const getTransactionCountForAccount = (accountId: string): number => {
    return transactions.filter(t => t.account_id === accountId || t.to_account_id === accountId).length;
  };


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-textBase dark:text-textBaseDark">Contas</h1>
        <Button onClick={openModalForNew} variant="primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Conta
        </Button>
      </div>

      {accounts.length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <AccountItem
              key={account.id}
              account={account}
              balance={calculateAccountBalance(account.id)}
              onEdit={openModalForEdit}
              onDelete={onDeleteAccount}
              transactionCount={getTransactionCountForAccount(account.id)}
              isPrivacyModeEnabled={isPrivacyModeEnabled}
            />
          ))}
        </ul>
      ) : (
        <p className="text-center text-textMuted dark:text-textMutedDark py-8">Nenhuma conta cadastrada. Adicione uma para começar!</p>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAccount ? 'Editar Conta' : 'Nova Conta'}>
        <div className="space-y-4">
          <Input
            label="Nome da Conta"
            id="accountName"
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Ex: Carteira, Banco X"
            required
          />
          <Input
            label="Saldo Inicial"
            id="initialBalance"
            type="number"
            step="0.01"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder={isPrivacyModeEnabled ? formatCurrency(0, 'BRL', 'pt-BR', true).replace('0,00', 'Ex: 1000.00') : "Ex: 1000.00"}
            required
          />
          {formError && <p className="text-sm text-destructive dark:text-destructiveDark/90">{formError}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveAccount}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountsView;