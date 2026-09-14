import { render, screen } from '@testing-library/react';
import type { ContextType } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../features/auth/AuthContext';
import type { AuthUser, UserRole } from '../../types/auth';
import { ProtectedRoute } from './ProtectedRoute';

type AuthValue = NonNullable<ContextType<typeof AuthContext>>;

const admin: AuthUser = {
  id: 'user-1',
  name: 'Rafael',
  email: 'rafael@example.com',
  role: 'ADMIN',
};

const comum: AuthUser = { ...admin, id: 'user-2', role: 'USER' };

/**
 * O contexto entra direto, sem AuthProvider: o que esta sob teste e a decisao
 * do guard a partir de um estado de auth, nao como aquele estado foi montado.
 */
function authValue(overrides: Partial<AuthValue>): AuthValue {
  return {
    user: null,
    organization: null,
    accessToken: null,
    isAuthenticated: false,
    login: vi.fn(),
    selectOrganization: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderGuard(value: AuthValue, allowedRoles?: UserRole[]) {
  return render(
    <MemoryRouter initialEntries={['/protegido']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
            <Route path="/protegido" element={<p>conteudo protegido</p>} />
          </Route>
          <Route path="/login" element={<p>tela de login</p>} />
          <Route path="/" element={<p>home</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('manda para o login quem nao esta autenticado', () => {
    renderGuard(authValue({}));

    expect(screen.getByText('tela de login')).toBeInTheDocument();
    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
  });

  it('manda para o login quando ha token mas nao ha usuario', () => {
    // Sessao pela metade -- uma entrada manipulada no storage chega assim.
    // Barrar aqui evita que o resto do app leia `user` como undefined.
    renderGuard(
      authValue({ isAuthenticated: true, accessToken: 'token', user: null }),
    );

    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('libera a rota sem restricao de papel para qualquer autenticado', () => {
    renderGuard(authValue({ isAuthenticated: true, user: comum }));

    expect(screen.getByText('conteudo protegido')).toBeInTheDocument();
  });

  it('libera a rota de ADMIN para o ADMIN', () => {
    renderGuard(authValue({ isAuthenticated: true, user: admin }), ['ADMIN']);

    expect(screen.getByText('conteudo protegido')).toBeInTheDocument();
  });

  it('desvia o USER para a raiz numa rota de ADMIN, sem vazar o conteudo', () => {
    renderGuard(authValue({ isAuthenticated: true, user: comum }), ['ADMIN']);

    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('conteudo protegido')).not.toBeInTheDocument();
  });
});
