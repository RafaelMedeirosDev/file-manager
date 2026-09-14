import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  LoginAuthenticated,
  LoginOrganizationRequired,
} from '@file-manager/shared';
import { AuthProvider } from '../features/auth/AuthContext';
import { authService } from '../features/auth/services/authService';
import { readSession } from '../features/auth/session';
import { LoginPage } from './LoginPage';

const authenticated: LoginAuthenticated = {
  status: 'authenticated',
  accessToken: 'token-da-sessao',
  user: {
    id: 'user-1',
    name: 'Rafael',
    email: 'rafael@example.com',
    role: 'ADMIN',
  },
  organization: { id: 'org-principal', name: 'Principal', slug: 'principal' },
};

const organizationRequired: LoginOrganizationRequired = {
  status: 'organization_required',
  preAuthToken: 'pre-auth-em-transito',
  user: { id: 'user-1', name: 'Rafael', email: 'rafael@example.com' },
  organizations: [
    {
      id: 'org-principal',
      name: 'Principal',
      slug: 'principal',
      role: 'ADMIN',
    },
    { id: 'org-demo', name: 'Demonstracao', slug: 'demo', role: 'USER' },
  ],
};

/**
 * A rota `/` renderiza um sentinela, e nao o app: o objetivo e provar que a
 * navegacao aconteceu, sem arrastar o AppLayout e as dez paginas para dentro
 * de um teste de login.
 */
function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>area autenticada</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/**
 * Preenche e envia o formulario como um usuario faria.
 *
 * O user-event, e nao o fireEvent, de proposito: o fireEvent dispara o evento
 * mesmo num controle `disabled`, e as linhas de organizacao desabilitam
 * durante a troca. Um teste com fireEvent passaria por cima desse estado.
 */
async function preencherEEnviar(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('Endereço de email'),
    'rafael@example.com',
  );
  await user.type(screen.getByLabelText('Senha'), 'senha-valida');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => {
  localStorage.clear();
});

describe('LoginPage', () => {
  it('entra direto quando o usuario tem uma organizacao so', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'login').mockResolvedValue(authenticated);

    renderLoginPage();
    await preencherEEnviar(user);

    expect(await screen.findByText('area autenticada')).toBeInTheDocument();
    expect(readSession()?.accessToken).toBe('token-da-sessao');
  });

  it('oferece a escolha da organizacao, com o papel de cada uma', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'login').mockResolvedValue(organizationRequired);

    renderLoginPage();
    await preencherEEnviar(user);

    expect(await screen.findByText('Escolha a organização')).toBeVisible();
    // O papel exibido e o da associacao, e e o que diz ao recrutador o que
    // esperar de cada entrada.
    expect(screen.getByRole('button', { name: /Principal/ })).toHaveTextContent(
      'Administrador',
    );
    expect(
      screen.getByRole('button', { name: /Demonstracao/ }),
    ).toHaveTextContent('Usuário');
    // O formulario de credenciais saiu de cena.
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
  });

  it('entra na organizacao escolhida', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'login').mockResolvedValue(organizationRequired);
    const selectOrganization = vi
      .spyOn(authService, 'selectOrganization')
      .mockResolvedValue({
        ...authenticated,
        accessToken: 'token-da-demo',
        organization: { id: 'org-demo', name: 'Demonstracao', slug: 'demo' },
      });

    renderLoginPage();
    await preencherEEnviar(user);
    await user.click(
      await screen.findByRole('button', { name: /Demonstracao/ }),
    );

    expect(selectOrganization).toHaveBeenCalledWith(
      'pre-auth-em-transito',
      'org-demo',
    );
    expect(await screen.findByText('area autenticada')).toBeInTheDocument();
    expect(readSession()?.organization.slug).toBe('demo');
  });

  it('mostra o erro do backend sem sair da tela de login', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'login').mockRejectedValue({
      response: { status: 401, data: { message: 'Credenciais invalidas' } },
    });

    renderLoginPage();
    await preencherEEnviar(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Credenciais invalidas',
    );
    expect(screen.queryByText('area autenticada')).not.toBeInTheDocument();
    expect(readSession()).toBeNull();
  });

  it('volta para as credenciais mantendo o email digitado', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'login').mockResolvedValue(organizationRequired);

    renderLoginPage();
    await preencherEEnviar(user);
    await user.click(
      await screen.findByRole('button', { name: '← Entrar com outra conta' }),
    );

    expect(screen.getByLabelText('Endereço de email')).toHaveValue(
      'rafael@example.com',
    );
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });
});
