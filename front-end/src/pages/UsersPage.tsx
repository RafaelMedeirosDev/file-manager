import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useUsers } from '../features/users/hooks/useUsers';
import { useChangePassword } from '../features/users/hooks/useChangePassword';
import { ChangePasswordModal } from '../features/users/components/ChangePasswordModal';

const AVATAR_COLORS = [
  'av-blue', 'av-indigo', 'av-violet', 'av-teal',
  'av-amber', 'av-rose', 'av-green', 'av-orange',
] as const;

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) ?? 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function EmptySearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="M8 11h6" opacity="0.5" />
    </svg>
  );
}

export function UsersPage() {
  const { user } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const {
    users, totalUsers, loading, loadingMore, error, actionError, deletingUserId,
    searchTerm, setSearchTerm,
    handleSoftDeleteUser,
    sentinelRef,
  } = useUsers();
  const changePassword = useChangePassword();

  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  useEffect(() => {
    if (!changePassword.success) return;
    const t = setTimeout(() => setIsPasswordModalOpen(false), 1200);
    return () => clearTimeout(t);
  }, [changePassword.success]);

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ paddingBottom: 4, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">Gerencie contas, permissões e acesso ao workspace.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 12, padding: '7px 12px' }}
            onClick={() => { changePassword.reset(); setIsPasswordModalOpen(true); }}
          >
            Minha senha
          </button>
          {isAdmin ? (
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: 12, padding: '7px 12px' }}
              onClick={() => navigate('/users/new')}
            >
              + Novo usuário
            </button>
          ) : null}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        currentPassword={changePassword.currentPassword}
        onCurrentPasswordChange={changePassword.setCurrentPassword}
        newPassword={changePassword.newPassword}
        onNewPasswordChange={changePassword.setNewPassword}
        confirmNewPassword={changePassword.confirmNewPassword}
        onConfirmNewPasswordChange={changePassword.setConfirmNewPassword}
        onSubmit={changePassword.handleSubmit}
        isSubmitting={changePassword.isSubmitting}
        error={changePassword.error}
        success={changePassword.success}
      />

      {/* Content */}
      <div className="page-content">
        {error ? (
          <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif', marginBottom: 12 }}>
            {error}
          </p>
        ) : null}
        {actionError ? (
          <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif', marginBottom: 12 }}>
            {actionError}
          </p>
        ) : null}

        <div className="users-panel">
          {/* Search bar */}
          <div className="users-search-bar">
            <div className="users-search-field">
              <SearchIcon />
              <input
                className="users-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                autoComplete="off"
              />
            </div>
            <span className="users-count">
              {loading ? '…' : `${totalUsers} usuário${totalUsers !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Column headers */}
          <div className="users-table-head">
            <div className="users-table-head-cell">Usuário</div>
            <div className="users-table-head-cell">Função</div>
            <div className="users-table-head-cell" />
          </div>

          {/* Rows */}
          {!loading ? (
            <>
              {users.map((u) => (
                <div key={u.id} className="user-row">
                  <div className="users-cell-user">
                    <div
                      className={`users-avatar ${getAvatarColor(u.name)}`}
                      aria-hidden="true"
                    >
                      {getInitials(u.name)}
                    </div>
                    <div className="users-meta">
                      <p className="users-name">{u.name}</p>
                      <p className="users-email">{u.email}</p>
                    </div>
                  </div>

                  <div>
                    {u.role === 'ADMIN' ? (
                      <span className="users-badge-admin">Administrador</span>
                    ) : (
                      <span className="users-badge-user">Usuário</span>
                    )}
                  </div>

                  <div className="users-actions-cell">
                    {isAdmin ? (
                      <button
                        type="button"
                        className="users-btn-delete"
                        onClick={() => handleSoftDeleteUser(u.id, u.name)}
                        disabled={deletingUserId === u.id}
                      >
                        {deletingUserId === u.id ? 'Excluindo…' : 'Excluir'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {users.length === 0 ? (
                <div className="users-empty-state">
                  <div className="users-empty-icon">
                    <EmptySearchIcon />
                  </div>
                  <h3>Nenhum usuário encontrado</h3>
                  <p>
                    {searchTerm
                      ? 'Tente buscar por um nome ou email diferente.'
                      : 'Nenhum usuário cadastrado ainda.'}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ padding: '24px 20px', fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#94a3b8' }}>
              Carregando...
            </div>
          )}
        </div>

        <div ref={sentinelRef} style={{ height: 40 }} />
        {loadingMore ? (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>
            Carregando mais resultados...
          </p>
        ) : null}
      </div>
    </>
  );
}
