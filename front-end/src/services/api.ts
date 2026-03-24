import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.toString().trim() || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const sessionRaw = localStorage.getItem('file-manager:session');

  if (!sessionRaw) {
    return config;
  }

  try {
    const session = JSON.parse(sessionRaw) as { accessToken?: string };

    if (session.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
  } catch {
    localStorage.removeItem('file-manager:session');
  }

  return config;
});
