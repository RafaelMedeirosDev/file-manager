import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useUsers } from '../features/users/hooks/useUsers';

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function UsersPage() {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const {
    users, totalUsers, loading, loadingMore, error, actionError, deletingUserId,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    changingPassword, passwordError, passwordSuccess,
    searchTerm, setSearchTerm,
    handleSoftDeleteUser, handleChangeOwnPassword,
    sentinelRef,
  } = useUsers();

  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  return (
    <>
      {/* Page Header */}
      <div className="page-header" style={{ paddingBottom: 4, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">Gerencie contas, permissões e acesso ao workspace.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}
            onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? 'Ocultar senha' : 'Minha senha'}
          </button>
          {isAdmin ? (
            <button type="button" className="btn-primary" style={{ fontSize: 12, padding: '7px 12px' }}
              onClick={() => navigate('/users/new')}>
              + Novo usuário
            </button>
          ) : null}
        </div>
      </div>

      {/* Toolbar */}
      <div className="page-toolbar" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <div className="page-toolbar-left" style={{ flex: '1 1 320px' }}>
          <div className="users-search-field">
            <SearchIcon />
            <input
              className="app-input users-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou email"
            />
          </div>
          {searchTerm ? (
            <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}
              onClick={() => setSearchTerm('')}>
              Limpar
            </button>
          ) : null}
        </div>
        <div className="page-toolbar-right">
          <span className="users-count">
            {totalUsers} resultado{totalUsers !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Change password panel */}
      {showPassword ? (
        <div className="page-expand-panel">
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 700, color: '#0d1e35' }}>
              Atualizar senha
            </p>
            <p style={{ margin: '4px 0 0 0', fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#64748b' }}>
              Essa alteração afeta apenas a sua conta.
            </p>
          </div>
          <form style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr)) auto' }}
            onSubmit={handleChangeOwnPassword}>
            <input className="app-input" type="password" value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Senha atual" minLength={6} maxLength={255} required />
            <input className="app-input" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha" minLength={6} maxLength={255} required />
            <input className="app-input" type="password" value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirmar nova senha" minLength={6} maxLength={255} required />
            <button type="submit" className="btn-primary" disabled={changingPassword} style={{ fontSize: 12 }}>
              {changingPassword ? 'Atualizando...' : 'Atualizar'}
            </button>
          </form>
          {passwordError ? <p style={{ marginTop: 8, fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{passwordError}</p> : null}
          {passwordSuccess ? <p style={{ marginTop: 8, fontSize: 13, color: '#10b981', fontFamily: 'Manrope, sans-serif' }}>{passwordSuccess}</p> : null}
        </div>
      ) : null}


      {/* Content */}
      <div className="page-content">
        {loading ? <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>Carregando...</p> : null}
        {error ? <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{error}</p> : null}
        {actionError ? <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif', marginBottom: 12 }}>{actionError}</p> : null}

        {!loading && !error ? (
          <>
            <ul className="users-list">
              {users.map((u) => (
                <li key={u.id} className="users-list-item">
                  <div className="users-list-primary">
                    <div className="users-avatar" aria-hidden="true">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="users-meta">
                      <p className="users-name">{u.name}</p>
                      <p className="users-email">{u.email}</p>
                    </div>
                  </div>
                  <div className="users-actions">
                    <span className="users-role">
                      {u.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                    </span>
                    {isAdmin ? (
                      <button type="button" className="btn-danger"
                        onClick={() => handleSoftDeleteUser(u.id, u.name)}
                        disabled={deletingUserId === u.id}
                        style={{ fontSize: 12, padding: '7px 12px' }}>
                        {deletingUserId === u.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
              {users.length === 0 ? (
                <li style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: 24, fontSize: 13, color: '#94a3b8', textAlign: 'center', fontFamily: 'Manrope, sans-serif', background: '#fff' }}>
                  Nenhum usuário encontrado.
                </li>
              ) : null}
            </ul>

            <div ref={sentinelRef} style={{ height: 40 }} />
            {loadingMore ? (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>
                Carregando mais resultados...
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
