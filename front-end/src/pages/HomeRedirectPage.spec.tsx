import { render, screen } from '@testing-library/react';
import type { ContextType } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../features/auth/AuthContext';
import type { AuthUser } from '../types/auth';
import { HomeRedirectPage } from './HomeRedirectPage';

type AuthValue = NonNullable<ContextType<typeof AuthContext>>;

const admin: AuthUser = {
  id: 'user-1',
  name: 'Rafael',
  email: 'rafael@example.com',
  role: 'ADMIN',
};

function renderHome(user: AuthUser | null) {
  const value: AuthValue = {
    user,
    organization: null,
    accessToken: user ? 'token' : null,
    isAuthenticated: Boolean(user),
    login: vi.fn(),
    selectOrganization: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/" element={<HomeRedirectPage />} />
          <Route path="/users" element={<p>lista de usuarios</p>} />
          <Route path="/folders" element={<p>pastas</p>} />
          <Route path="/login" element={<p>tela de login</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('HomeRedirectPage', () => {
  it('leva o ADMIN para a lista de usuarios', () => {
    renderHome(admin);

    expect(screen.getByText('lista de usuarios')).toBeInTheDocument();
  });

  it('leva o USER para as pastas, que e a unica area dele', () => {
    renderHome({ ...admin, role: 'USER' });

    expect(screen.getByText('pastas')).toBeInTheDocument();
  });

  it('leva para o login quem nao tem usuario na sessao', () => {
    renderHome(null);

    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });
});
