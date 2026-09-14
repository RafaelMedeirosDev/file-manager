import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';
import type { LoginOrganizationRequired } from '@file-manager/shared';

type OrganizationChoice = LoginOrganizationRequired['organizations'][number];

// ── Return type ──────────────────────────────────────────

type UseLoginReturn = {
  step: 'credentials' | 'organization';
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string | null;
  loading: boolean;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  organizations: OrganizationChoice[];
  /** Id da organizacao cuja troca esta em curso, para o estado de carregamento. */
  selectingOrganizationId: string | null;
  handleSelectOrganization: (organizationId: string) => Promise<void>;
  backToCredentials: () => void;
};

// ── Hook ────────────────────────────────────────────────

/**
 * O login tem dois passos, e o segundo so aparece para quem pertence a mais de
 * uma organizacao — com uma associacao so, o backend ja devolve a sessao.
 *
 * `preAuthToken` e a lista de organizacoes vivem SO aqui, em estado React.
 * Nunca no localStorage: o token vale poucos minutos e e uma credencial em
 * transito, nao uma sessao. O efeito colateral e desejado -- recarregar a
 * pagina na tela de escolha volta ao login, que e o comportamento correto e
 * sai de graca por nao persistir nada.
 */
export function useLogin(): UseLoginReturn {
  const { login, selectOrganization } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationChoice[]>([]);
  const [selectingOrganizationId, setSelectingOrganizationId] = useState<
    string | null
  >(null);

  const step = preAuthToken ? 'organization' : 'credentials';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login({ email, password });

      if (response.status === 'organization_required') {
        setPreAuthToken(response.preAuthToken);
        setOrganizations(response.organizations);
        return;
      }

      navigate('/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não foi possível autenticar.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectOrganization(organizationId: string) {
    if (!preAuthToken) {
      return;
    }

    setError(null);
    setSelectingOrganizationId(organizationId);

    try {
      await selectOrganization(preAuthToken, organizationId);
      navigate('/');
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, 'Não foi possível acessar esta organização.'),
      );
    } finally {
      setSelectingOrganizationId(null);
    }
  }

  /**
   * Descarta o pre-auth ao voltar. Guardar o token para reaproveitar seria
   * pior: ele expira sozinho, e o passo 1 e barato.
   */
  function backToCredentials() {
    setPreAuthToken(null);
    setOrganizations([]);
    setError(null);
    setPassword('');
  }

  return {
    step,
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    handleSubmit,
    organizations,
    selectingOrganizationId,
    handleSelectOrganization,
    backToCredentials,
  };
}
