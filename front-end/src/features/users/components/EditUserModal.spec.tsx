import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserItem } from '../../../shared/types';
import { usersService } from '../services/usersService';
import { EditUserModal } from './EditUserModal';

const user: UserItem = {
  id: 'user-1',
  name: 'Ana Carolina',
  email: 'ana@example.com',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

let onClose: () => void;
let onSaved: () => void;

beforeEach(() => {
  onClose = vi.fn();
  onSaved = vi.fn();
});

function renderModal(isSelf = false) {
  return render(
    <EditUserModal
      user={user}
      isSelf={isSelf}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
}

describe('EditUserModal', () => {
  it('abre com os dados do usuario e o botao de salvar desabilitado', () => {
    renderModal();

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Carolina');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com');
    // Senha em branco significa "manter a atual" -- nunca vem preenchida.
    expect(screen.getByLabelText('Nova senha')).toHaveValue('');
    // Nada mudou ainda, entao nao ha o que salvar.
    expect(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    ).toBeDisabled();
  });

  it('salva o campo alterado e avisa quem chamou', async () => {
    const usuario = userEvent.setup();
    const update = vi.spyOn(usersService, 'update').mockResolvedValue(user);

    renderModal();

    const nome = screen.getByLabelText('Nome completo');
    await usuario.clear(nome);
    await usuario.type(nome, 'Ana Ribeiro');
    await usuario.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    );

    expect(update).toHaveBeenCalledWith('user-1', { name: 'Ana Ribeiro' });
    expect(onSaved).toHaveBeenCalled();
  });

  it('mostra o erro do backend sem fechar', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(usersService, 'update').mockRejectedValue({
      response: { status: 409, data: { message: 'Email ja esta cadastrado' } },
    });

    renderModal();

    const email = screen.getByLabelText('E-mail');
    await usuario.clear(email);
    await usuario.type(email, 'duplicado@example.com');
    await usuario.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    );

    expect(await screen.findByText('Email ja esta cadastrado')).toBeVisible();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('avisa o ADMIN quando ele edita o proprio e-mail de acesso', () => {
    renderModal(true);

    expect(screen.getByText(/seu e-mail de acesso/i)).toBeVisible();
  });

  it('nao mostra esse aviso ao editar outra pessoa', () => {
    renderModal(false);

    expect(screen.queryByText(/seu e-mail de acesso/i)).not.toBeInTheDocument();
  });
});
