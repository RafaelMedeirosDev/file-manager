import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserItem } from '../../../shared/types';
import { usersService } from '../services/usersService';
import { useEditUser } from './useEditUser';

const user: UserItem = {
  id: 'user-1',
  name: 'Ana Carolina',
  email: 'ana@example.com',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

/**
 * O hook so usa `preventDefault` do evento, como o formulario real.
 */
function formEvent(): React.FormEvent<HTMLFormElement> {
  return {
    preventDefault: () => undefined,
  } as unknown as React.FormEvent<HTMLFormElement>;
}

let onSaved: () => void;

beforeEach(() => {
  onSaved = vi.fn();
});

function renderEditUser() {
  return renderHook(() => useEditUser(user, onSaved));
}

describe('useEditUser', () => {
  it('envia somente o campo alterado', async () => {
    const update = vi.spyOn(usersService, 'update').mockResolvedValue(user);

    const { result } = renderEditUser();

    act(() => result.current.setName('Ana Carolina Ribeiro'));

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    // Nem `email` nem `password` aparecem: o e-mail nao mudou e a senha esta
    // em branco.
    expect(update).toHaveBeenCalledWith('user-1', {
      name: 'Ana Carolina Ribeiro',
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('NAO envia a senha quando o campo fica em branco', async () => {
    const update = vi.spyOn(usersService, 'update').mockResolvedValue(user);

    const { result } = renderEditUser();

    act(() => result.current.setEmail('outro@example.com'));

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    // A assercao que mais importa deste arquivo. Uma senha vazia enviada
    // seria hasheada pelo backend e substituiria a senha do usuario -- ele
    // perderia o acesso sem ninguem ter pedido isso.
    const payload = update.mock.calls[0][1];
    expect(payload).not.toHaveProperty('password');
    expect(payload).toEqual({ email: 'outro@example.com' });
  });

  it('envia a senha quando ela e preenchida', async () => {
    const update = vi.spyOn(usersService, 'update').mockResolvedValue(user);

    const { result } = renderEditUser();

    act(() => result.current.setPassword('senha-nova'));

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    expect(update).toHaveBeenCalledWith('user-1', { password: 'senha-nova' });
  });

  it('ignora diferenca de caixa e de espaco no e-mail', async () => {
    const update = vi.spyOn(usersService, 'update');

    const { result } = renderEditUser();

    act(() => result.current.setEmail('  ANA@example.com  '));

    // O backend normaliza com trimLowerCase, entao isto e o MESMO e-mail --
    // nao ha alteracao a enviar.
    expect(result.current.hasChanges).toBe(false);

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    expect(update).not.toHaveBeenCalled();
  });

  it('nao chama a API quando nada mudou', async () => {
    const update = vi.spyOn(usersService, 'update');

    const { result } = renderEditUser();

    expect(result.current.hasChanges).toBe(false);

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    // O backend responde 400 sem campo nenhum; barrar aqui evita o erro.
    expect(update).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('expoe a mensagem do backend quando o e-mail ja existe', async () => {
    vi.spyOn(usersService, 'update').mockRejectedValue({
      response: { status: 409, data: { message: 'Email ja esta cadastrado' } },
    });

    const { result } = renderEditUser();

    act(() => result.current.setEmail('duplicado@example.com'));

    await act(async () => {
      await result.current.handleSubmit(formEvent());
    });

    expect(result.current.error).toBe('Email ja esta cadastrado');
    // O modal continua aberto: quem chama e que fecha, e onSaved nao correu.
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('invalida o formulario quando o nome fica vazio', () => {
    const { result } = renderEditUser();

    act(() => result.current.setName('   '));

    expect(result.current.isValid).toBe(false);
  });
});
