import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act } from 'react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import type { AuthUser } from '../../../types/auth';
import { AuthContext } from '../../auth/AuthContext';
import { usersService } from '../../users/services/usersService';
import { SidebarProvider } from '../contexts/SidebarContext';
import { foldersService } from '../services/foldersService';
import { useFolders } from './useFolders';

type AuthValue = NonNullable<React.ContextType<typeof AuthContext>>;

const admin: AuthUser = {
  id: 'admin-1',
  name: 'Rafael',
  email: 'rafael@example.com',
  role: 'ADMIN',
};

function authValue(user: AuthUser): AuthValue {
  return {
    user,
    organization: null,
    accessToken: 'token',
    isAuthenticated: true,
    login: vi.fn(),
    selectOrganization: vi.fn(),
    logout: vi.fn(),
  };
}

/**
 * Sonda de URL: a selecao mora na query string, entao o que se observa e o
 * endereco -- nao um mock de setter.
 */
let currentSearch = '';
let listFolders: MockInstance;
let listUsers: MockInstance;

function LocationProbe() {
  currentSearch = useLocation().search;
  return null;
}

function renderUseFolders(entry: string, user: AuthUser = admin) {
  function wrapper({ children }: PropsWithChildren) {
    return (
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={authValue(user)}>
          <SidebarProvider>
            {children}
            <LocationProbe />
          </SidebarProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  }

  return renderHook(() => useFolders(), { wrapper });
}

beforeEach(() => {
  currentSearch = '';
  listFolders = vi.spyOn(foldersService, 'list').mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 100, total: 0, hasNextPage: false },
  });
  listUsers = vi.spyOn(usersService, 'list').mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 100, total: 0, hasNextPage: false },
  });
});

describe('useFolders, seleção pela URL', () => {
  it('lê o usuário selecionado do parâmetro', () => {
    const { result } = renderUseFolders('/folders?userId=abc');

    expect(result.current.selectedUserId).toBe('abc');
  });

  it('não seleciona ninguém quando o parâmetro está ausente', () => {
    const { result } = renderUseFolders('/folders');

    expect(result.current.selectedUserId).toBeNull();
  });

  it('escreve o parâmetro ao selecionar', async () => {
    const { result } = renderUseFolders('/folders');

    act(() => result.current.selectUserId('xyz'));

    await waitFor(() => expect(currentSearch).toBe('?userId=xyz'));
    expect(result.current.selectedUserId).toBe('xyz');
  });

  it('remove o parâmetro ao limpar', async () => {
    const { result } = renderUseFolders('/folders?userId=abc');

    act(() => result.current.selectUserId(null));

    await waitFor(() => expect(currentSearch).toBe(''));
    expect(result.current.selectedUserId).toBeNull();
  });

  it('busca as pastas quando há um usuário na URL', async () => {
    renderUseFolders('/folders?userId=abc');

    // A carga e disparada pela selecao; sem parametro ela nao acontece.
    await waitFor(() => expect(listFolders).toHaveBeenCalled());
  });

  it('não busca pastas sem usuário selecionado', async () => {
    renderUseFolders('/folders');

    await waitFor(() => expect(listUsers).toHaveBeenCalled());
    expect(listFolders).not.toHaveBeenCalled();
  });

  it('põe o próprio id na URL quando quem entra é um USER', async () => {
    const comum: AuthUser = { ...admin, id: 'user-9', role: 'USER' };

    renderUseFolders('/folders', comum);

    // Sem isto a URL mentiria para quem nao e ADMIN: a tela mostraria as
    // pastas dele, e o endereco diria que nada esta selecionado.
    await waitFor(() => expect(currentSearch).toBe('?userId=user-9'));
  });
});
