import axios from 'axios';
import { readSession } from '../features/auth/session';

// Mesma politica do back-end (src/config/env.ts): variavel obrigatoria ausente
// derruba a aplicacao na inicializacao, em vez de falhar longe da causa.
//
// As duas alternativas escondem o erro. Um fallback fixo para localhost faz um
// build de producao mal configurado chamar a maquina de quem abriu o site; sem
// baseURL, o axios monta URLs relativas e as chamadas batem na origem do
// proprio front. Nos dois casos o sintoma aparece como falha de login.
const API_BASE_URL = import.meta.env.VITE_API_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    'Missing required environment variable: VITE_API_URL. ' +
      'Copie front-end/.env.example para front-end/.env ' +
      '(em desenvolvimento a API sobe em http://localhost:3000).',
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const session = readSession();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});
