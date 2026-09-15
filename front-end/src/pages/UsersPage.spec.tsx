import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../types/auth';
import { AuthContext } from '../features/auth/AuthContext';
import { usersService } from '../features/users/services/usersService';
import { UsersPage } from './UsersPage';

type AuthValue = NonNullable<React.ContextType<typeof AuthContext>>;

const admin: AuthUser = {
  id: 'admin-1',
  name: 'Rafael Medeiros',
  email: 'rafael@example.com',
  role: 'ADMIN',
};

const lista = [
  {
    id: 'user-7',
    name: 'Ana Carolina',
    email: 'ana@example.com',
    role: 'USER' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

let currentLocation = '';

function LocationProbe() {
  const location = useLocation();
  currentLocation = `${location.pathname}${location.search}`;
  return null;
}

function Wrapper({ children }: PropsWithChildren) {
  const value: AuthValue = {
    user: admin,
    organization: null,
    accessToken: 'token',
    isAuthenticated: true,
    login: vi.fn(),
    selectOrganization: vi.fn(),
    logout: vi.fn(),
  };

  return (
    <MemoryRouter initialEntries={['/users']}>
      <AuthContext.Provider value={value}>
        {children}
        <LocationProbe />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

function renderUsersPage() {
  return render(
    <Wrapper>
      <Routes>
        <Route path="/users" element={<UsersPage />} />
        <Route path="/folders" element={<p>tela de pastas</p>} />
      </Routes>
    </Wrapper>,
  );
}

beforeEach(() => {
  currentLocation = '';
  vi.spyOn(usersService, 'list').mockResolvedValue({
    data: lista,
    meta: { page: 1, limit: 10, total: 1, hasNextPage: false },
  });
});

describe('UsersPage', () => {
  it('o nome do usuário é um link para as pastas dele', async () => {
    renderUsersPage();

    const link = await screen.findByRole('link', { name: 'Ana Carolina' });

    expect(link).toHaveAttribute('href', '/folders?userId=user-7');
  });

  it('clicar no nome navega para as pastas daquele usuário', async () => {
    const user = userEvent.setup();
    renderUsersPage();

    await user.click(await screen.findByRole('link', { name: 'Ana Carolina' }));

    expect(screen.getByText('tela de pastas')).toBeInTheDocument();
    expect(currentLocation).toBe('/folders?userId=user-7');
  });

  it('as ações continuam sendo botões, e não links', async () => {
    renderUsersPage();

    await screen.findByRole('link', { name: 'Ana Carolina' });

    expect(
      screen.getByRole('button', { name: 'Editar Ana Carolina' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Excluir Ana Carolina' }),
    ).toBeInTheDocument();
  });

  it('clicar em editar NÃO navega', async () => {
    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByRole('link', { name: 'Ana Carolina' });
    await user.click(
      screen.getByRole('button', { name: 'Editar Ana Carolina' }),
    );

    // A armadilha que o desenho de link evita: com a linha inteira clicavel,
    // abrir o modal de edicao tambem navegaria, a menos que alguem lembrasse
    // de chamar stopPropagation. Aqui nao ha o que lembrar.
    expect(currentLocation).toBe('/users');
    expect(screen.getByText('Editar usuário')).toBeInTheDocument();
  });
});
