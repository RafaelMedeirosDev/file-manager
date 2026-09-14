import { act, renderHook, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  LoginAuthenticated,
  LoginOrganizationRequired,
} from '@file-manager/shared';
import { AuthProvider } from '../AuthContext';
import { readSession } from '../session';
import { authService } from '../services/authService';
import { useLogin } from './useLogin';

// ── Fixtures ────────────────────────────────────────────

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

const authenticatedNaDemo: LoginAuthenticated = {
  status: 'authenticated',
  accessToken: 'token-da-demo',
  user: {
    id: 'user-1',
    name: 'Rafael',
    email: 'rafael@example.com',
    role: 'USER',
  },
  organization: { id: 'org-demo', name: 'Demonstracao', slug: 'demo' },
};

/** Erro no formato que o axios entrega, que e o que getApiErrorMessage le. */
function apiError(status: number, message: string) {
  return { response: { status, data: { message } } };
}

/**
 * O hook so usa `preventDefault` do evento. Construir o minimo e mais honesto
 * que arrastar um SyntheticEvent inteiro para dentro do teste.
 */
function formEvent(): React.FormEvent<HTMLFormElement> {
  return {
    preventDefault: () => undefined,
  } as unknown as React.FormEvent<HTMLFormElement>;
}

// ── Setup ───────────────────────────────────────────────

/**
 * Sonda de rota: em vez de mockar o react-router para espiar o `navigate`, a
 * navegacao e observada pelo efeito dela. Um mock provaria que a funcao foi
 * chamada; isto prova que a rota mudou.
 */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="rota">{location.pathname}</span>;
}

/**
 * O AuthProvider entra de verdade, nao mockado: e o que faz o teste percorrer
 * login -> startSession -> writeSession -> localStorage. O mock fica no
 * authService, que e a fronteira HTTP -- o seam que .claude/rules/tests.md pede.
 */
function wrapper({ children }: PropsWithChildren) {
  return (
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        {children}
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderUseLogin() {
  return renderHook(() => useLogin(), { wrapper });
}

function rotaAtual() {
  return screen.getByTestId('rota').textContent;
}

beforeEach(() => {
  localStorage.clear();
});

// ── Passo 1: uma organizacao ────────────────────────────

describe('useLogin, com uma organizacao so', () => {
  it('grava a sessao e navega para a raiz', async () => {
    const login = vi
      .spyOn(authService, 'login')
      .mockResolvedValue(authenticated);

    const { result } = renderUseLogin();

    act(() => {
      result.current.setEmail('rafael@example.com');
      result.current.setPassword('senha-valida');
    });

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    expect(login).toHaveBeenCalledWith({
      email: 'rafael@example.com',
      password: 'senha-valida',
    });
    expect(readSession()).toEqual({
      accessToken: 'token-da-sessao',
      user: authenticated.user,
      organization: authenticated.organization,
    });
    // O atalho de uma organizacao: nao passa pela tela de escolha.
    expect(result.current.step).toBe('credentials');
    expect(rotaAtual()).toBe('/');
  });

  it('mostra a mensagem do backend quando a credencial e invalida', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(
      apiError(401, 'Credenciais invalidas'),
    );

    const { result } = renderUseLogin();

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    expect(result.current.error).toBe('Credenciais invalidas');
    expect(readSession()).toBeNull();
    expect(rotaAtual()).toBe('/login');
    // O loading tem que voltar, senao o botao fica travado para sempre.
    expect(result.current.loading).toBe(false);
  });
});

// ── Passo 2: duas organizacoes ──────────────────────────

describe('useLogin, com duas organizacoes', () => {
  it('pede a escolha e NAO persiste nada', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue(organizationRequired);

    const { result } = renderUseLogin();

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    expect(result.current.step).toBe('organization');
    expect(result.current.organizations).toHaveLength(2);

    // A assercao que mais importa deste arquivo. O preAuthToken e uma
    // credencial em transito, nao uma sessao: ele vive so em estado React. Se
    // um dia alguem o mandar para o storage, recarregar a pagina na tela de
    // escolha passaria a restaurar meia sessao -- e este teste fica vermelho.
    expect(localStorage.length).toBe(0);
    expect(rotaAtual()).toBe('/login');
  });

  it('troca o pre-auth pelo token da organizacao escolhida', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue(organizationRequired);
    const selectOrganization = vi
      .spyOn(authService, 'selectOrganization')
      .mockResolvedValue(authenticatedNaDemo);

    const { result } = renderUseLogin();

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    await act(async () => {
      await result.current.handleSelectOrganization('org-demo');
    });

    // O token enviado tem que ser o pre-auth do passo 1, nao outro.
    expect(selectOrganization).toHaveBeenCalledWith(
      'pre-auth-em-transito',
      'org-demo',
    );
    expect(readSession()?.organization).toEqual({
      id: 'org-demo',
      name: 'Demonstracao',
      slug: 'demo',
    });
    // O papel vem da associacao NAQUELA organizacao: ADMIN na principal,
    // USER na demo.
    expect(readSession()?.user.role).toBe('USER');
    expect(rotaAtual()).toBe('/');
  });

  it('mostra o erro e continua no passo da organizacao quando a troca falha', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue(organizationRequired);
    vi.spyOn(authService, 'selectOrganization').mockRejectedValue(
      apiError(403, 'Usuario nao pertence a esta organizacao'),
    );

    const { result } = renderUseLogin();

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    await act(async () => {
      await result.current.handleSelectOrganization('org-demo');
    });

    expect(result.current.error).toBe(
      'Usuario nao pertence a esta organizacao',
    );
    // Continuar no passo 2 e o comportamento certo: a escolha falhou, mas o
    // pre-auth ainda vale e as outras organizacoes seguem disponiveis.
    expect(result.current.step).toBe('organization');
    expect(result.current.selectingOrganizationId).toBeNull();
    expect(readSession()).toBeNull();
  });

  it('backToCredentials descarta o pre-auth e a senha, e mantem o email', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue(organizationRequired);

    const { result } = renderUseLogin();

    act(() => {
      result.current.setEmail('rafael@example.com');
      result.current.setPassword('senha-valida');
    });

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    act(() => {
      result.current.backToCredentials();
    });

    expect(result.current.step).toBe('credentials');
    expect(result.current.organizations).toEqual([]);
    // A senha sai e o email fica: quem volta normalmente errou a conta, nao o
    // email, e reescrever o email a cada volta seria atrito sem motivo.
    expect(result.current.password).toBe('');
    expect(result.current.email).toBe('rafael@example.com');
  });
});
