import { useState } from 'react';
import type { UserItem } from '../../../shared/types';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';
import { usersService, type UpdateUserPayload } from '../services/usersService';

type UseEditUserReturn = {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  /** Falso quando nada mudou -- desabilita o botao de salvar. */
  hasChanges: boolean;
  isValid: boolean;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

/**
 * Estado do formulario de edicao de um usuario.
 *
 * O `user` vem por argumento e inicializa os campos uma vez. Quem consome
 * monta o modal apenas enquanto ha alguem em edicao, entao trocar de usuario
 * remonta o hook -- e por isso nao ha efeito de sincronizacao aqui, que e a
 * fonte classica de formulario mostrando os dados do registro anterior.
 */
export function useEditUser(
  user: UserItem,
  onSaved: () => void,
): UseEditUserReturn {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  // Mesma normalizacao do backend (`trimLowerCase` no DTO), para que digitar o
  // proprio e-mail com outra caixa nao conte como alteracao.
  const normalizedEmail = email.trim().toLowerCase();

  /**
   * So o que mudou entra no payload, e isso nao e economia de bytes.
   *
   * Um campo de senha vazio enviado como string vazia seria hasheado pelo
   * backend e substituiria a senha do usuario -- ele perderia o acesso sem que
   * ninguem tivesse pedido nada. Um e-mail reenviado igual dispararia a
   * consulta de duplicidade a toa.
   */
  function buildPayload(): UpdateUserPayload {
    const payload: UpdateUserPayload = {};

    if (trimmedName !== user.name) {
      payload.name = trimmedName;
    }

    if (normalizedEmail !== user.email) {
      payload.email = normalizedEmail;
    }

    if (password.length > 0) {
      payload.password = password;
    }

    return payload;
  }

  const hasChanges = Object.keys(buildPayload()).length > 0;
  const isValid = trimmedName.length > 0 && normalizedEmail.length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const payload = buildPayload();

    // O backend responde 400 quando nao recebe campo nenhum. Barrar aqui
    // transforma isso num botao desabilitado em vez de um erro.
    if (Object.keys(payload).length === 0) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await usersService.update(user.id, payload);
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erro ao salvar usuário.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    error,
    hasChanges,
    isValid,
    handleSubmit,
  };
}
