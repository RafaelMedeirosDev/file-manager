import { useState } from 'react';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';
import { usersService } from '../services/usersService';

type UseChangePasswordReturn = {
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  reset: () => void;
};

export function useChangePassword(): UseChangePasswordReturn {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      await usersService.changeOwnPassword({ currentPassword, newPassword, confirmNewPassword });
      reset();
      setSuccess('Senha atualizada com sucesso.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao atualizar senha.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isSubmitting,
    error,
    success,
    handleSubmit,
    reset,
  };
}
