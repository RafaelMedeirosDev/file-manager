import axios from 'axios';
import { readSession } from '../features/auth/session';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.toString().trim() || 'http://localhost:3001';

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
