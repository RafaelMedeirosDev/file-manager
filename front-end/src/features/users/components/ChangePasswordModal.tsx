import { Modal } from '../../../shared/components/Modal';

type ChangePasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPassword: string;
  onCurrentPasswordChange: (v: string) => void;
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  confirmNewPassword: string;
  onConfirmNewPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
};

export function ChangePasswordModal({
  isOpen,
  onClose,
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmNewPassword,
  onConfirmNewPasswordChange,
  onSubmit,
  isSubmitting,
  error,
  success,
}: ChangePasswordModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atualizar senha"
      subtitle="Essa alteração afeta apenas a sua conta."
    >
      <form onSubmit={onSubmit}>
        <div className="modal-field">
          <label className="modal-label" htmlFor="cp-current">
            Senha atual
          </label>
          <input
            id="cp-current"
            className="app-input"
            type="password"
            value={currentPassword}
            onChange={(e) => onCurrentPasswordChange(e.target.value)}
            minLength={6}
            maxLength={255}
            required
          />
        </div>
        <div className="modal-field">
          <label className="modal-label" htmlFor="cp-new">
            Nova senha
          </label>
          <input
            id="cp-new"
            className="app-input"
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            minLength={6}
            maxLength={255}
            required
          />
        </div>
        <div className="modal-field">
          <label className="modal-label" htmlFor="cp-confirm">
            Confirmar nova senha
          </label>
          <input
            id="cp-confirm"
            className="app-input"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
            minLength={6}
            maxLength={255}
            required
          />
        </div>
        {error ? <p className="modal-feedback-error">{error}</p> : null}
        {success ? <p className="modal-feedback-success">{success}</p> : null}
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
            disabled={isSubmitting}
            style={{ fontSize: 12 }}
          >
            {isSubmitting ? 'Atualizando...' : 'Atualizar senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
