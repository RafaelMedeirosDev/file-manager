import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';

// ── Return type ──────────────────────────────────────────

type UseLoginReturn = {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string | null;
  loading: boolean;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

// ── Hook ────────────────────────────────────────────────

export function useLogin(): UseLoginReturn {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não foi possível autenticar.'));
    } finally {
      setLoading(false);
    }
  }

  return { email, setEmail, password, setPassword, error, loading, handleSubmit };
}
