import { Modal } from '../../../shared/components/Modal';
import type { UserItem } from '../../../shared/types';
import { useEditUser } from '../hooks/useEditUser';

type EditUserModalProps = {
  user: UserItem;
  /** O ADMIN esta editando a propria conta. So muda o aviso exibido. */
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Diferente do ChangePasswordModal, que e puramente apresentacional, este
 * componente chama o proprio hook. O motivo e o ciclo de vida: ele so e
 * montado enquanto ha um usuario em edicao, e e esse mount/unmount que zera o
 * formulario ao trocar de usuario. Manter o estado fora exigiria um efeito de
 * sincronizacao -- a origem classica do formulario que mostra os dados do
 * registro anterior.
 */
export function EditUserModal({
  user,
  isSelf,
  onClose,
  onSaved,
}: EditUserModalProps) {
  const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    error,
    hasChanges,
    isValid,
    handleSubmit,
  } = useEditUser(user, onSaved);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Editar usuário"
      subtitle="As alterações valem apenas nesta organização."
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-field">
          <label className="modal-label" htmlFor="edit-user-name">
            Nome completo
          </label>
          <input
            id="edit-user-name"
            className="app-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            required
          />
        </div>

        <div className="modal-field">
          <label className="modal-label" htmlFor="edit-user-email">
            E-mail
          </label>
          <input
            id="edit-user-email"
            className="app-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={50}
            required
          />
          {isSelf ? (
            <p className="modal-hint">
              Este é o seu e-mail de acesso. Alterá-lo muda a credencial com que
              você entra no sistema.
            </p>
          ) : null}
        </div>

        <div className="modal-field">
          <label className="modal-label" htmlFor="edit-user-password">
            Nova senha
          </label>
          <input
            id="edit-user-password"
            className="app-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={50}
            autoComplete="new-password"
            placeholder="Deixe em branco para manter a atual"
          />
          <p className="modal-hint">
            Em branco, a senha atual continua valendo.
          </p>
        </div>

        {error ? <p className="modal-feedback-error">{error}</p> : null}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ fontSize: 12 }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || !hasChanges || !isValid}
            style={{ fontSize: 12 }}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
