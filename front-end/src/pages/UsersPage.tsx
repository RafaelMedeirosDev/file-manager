import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useUsers } from '../features/users/hooks/useUsers';

export function UsersPage() {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const {
    users, loading, loadingMore, error, actionError,
    creatingUser, deletingUserId,
    newUserName, setNewUserName,
    newUserEmail, setNewUserEmail,
    newUserPassword, setNewUserPassword,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    changingPassword, passwordError, passwordSuccess,
    searchName, setSearchName,
    searchEmail, setSearchEmail,
    handleCreateUser, handleSoftDeleteUser, handleChangeOwnPassword,
    sentinelRef,
  } = useUsers();

  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">Painel de contas, perfis e acessos.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" className="btn-secondary" style={{ fontSize: 12 }}
            onClick={() => { setShowPassword((v) => !v); setShowCreate(false); }}>
            {showPassword ? 'Fechar' : 'Redefinir minha senha'}
          </button>
          {isAdmin ? (
            <button type="button" className="btn-primary" style={{ fontSize: 12 }}
              onClick={() => navigate('/users/new')}>
              + Novo Usuário
            </button>
          ) : null}
        </div>
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar-left">
          <input className="app-input" style={{ maxWidth: 180 }} value={searchName}
            onChange={(e) => setSearchName(e.target.value)} placeholder="Buscar por nome" />
          <input className="app-input" style={{ maxWidth: 200 }} type="email" value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)} placeholder="Buscar por email" />
          {(searchName || searchEmail) ? (
            <button type="button" className="btn-secondary" style={{ fontSize: 12 }}
              onClick={() => { setSearchName(''); setSearchEmail(''); }}>
              Limpar
            </button>
          ) : null}
        </div>
        <div className="page-toolbar-right">
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#94a3b8' }}>
            {users.length} usuário{users.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Change password panel */}
      {showPassword ? (
        <div className="page-expand-panel">
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

        {!loading && !error ? (
          <>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map((u) => (
                <li key={u.id} className="app-list-item">
                  <div>
                    <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 700, color: '#0d1e35', margin: '0 0 2px 0' }}>{u.name}</p>
                    <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#94a3b8', margin: 0 }}>{u.email}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    <strong className="app-chip">{u.role}</strong>
                    {isAdmin ? (
                      <button type="button" className="btn-danger"
                        onClick={() => handleSoftDeleteUser(u.id, u.name)}
                        disabled={deletingUserId === u.id}>
                        {deletingUserId === u.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
              {users.length === 0 ? (
                <li style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: 20, fontSize: 13, color: '#94a3b8', textAlign: 'center', fontFamily: 'Manrope, sans-serif' }}>
                  Nenhum usuário encontrado.
                </li>
              ) : null}
            </ul>

            <div ref={sentinelRef} style={{ height: 40 }} />
            {loadingMore ? (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>
                Carregando mais usuários...
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
