import { useAuth } from '../features/auth/hooks/useAuth';
import { useUsers } from '../features/users/hooks/useUsers';

export function UsersPage() {
  const { user } = useAuth();
  const {
    users,
    loading,
    loadingMore,
    error,
    actionError,
    creatingUser,
    deletingUserId,
    newUserName,
    setNewUserName,
    newUserEmail,
    setNewUserEmail,
    newUserPassword,
    setNewUserPassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    changingPassword,
    passwordError,
    passwordSuccess,
    searchName,
    setSearchName,
    searchEmail,
    setSearchEmail,
    handleCreateUser,
    handleSoftDeleteUser,
    handleChangeOwnPassword,
    sentinelRef,
  } = useUsers();

  return (
    <div>
      <h1 className="app-page-title">Usuários</h1>
      <p className="app-page-subtitle">Painel administrativo de contas e perfis.</p>

      <form
        className="mt-4 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={handleChangeOwnPassword}
      >
        <input
          className="app-input"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Senha atual"
          minLength={6}
          maxLength={255}
          required
        />
        <input
          className="app-input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nova senha"
          minLength={6}
          maxLength={255}
          required
        />
        <input
          className="app-input"
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Confirmar nova senha"
          minLength={6}
          maxLength={255}
          required
        />
        <button type="submit" className="btn-primary" disabled={changingPassword}>
          {changingPassword ? 'Atualizando...' : 'Redefinir minha senha'}
        </button>
      </form>

      {passwordError ? (
        <p className="mt-3 text-sm font-medium text-rose-600">{passwordError}</p>
      ) : null}
      {passwordSuccess ? (
        <p className="mt-3 text-sm font-medium text-emerald-600">{passwordSuccess}</p>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className="app-input"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Buscar por nome"
        />
        <input
          className="app-input"
          type="email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          placeholder="Buscar por email"
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setSearchName(''); setSearchEmail(''); }}
        >
          Limpar filtros
        </button>
      </div>

      {user?.role === 'ADMIN' ? (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={handleCreateUser}
        >
          <input
            className="app-input"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Nome"
            required
          />
          <input
            className="app-input"
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            className="app-input"
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            placeholder="Senha"
            required
          />
          <button type="submit" className="btn-primary" disabled={creatingUser}>
            {creatingUser ? 'Criando...' : 'Criar usuário'}
          </button>
        </form>
      ) : null}

      {actionError ? (
        <p className="mt-3 text-sm font-medium text-rose-600">{actionError}</p>
      ) : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">Carregando...</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          <ul className="mt-4 space-y-2">
            {users.map((u) => (
              <li key={u.id} className="app-list-item">
                <span className="text-sm text-slate-700">
                  <span className="block font-semibold text-slate-900">{u.name}</span>
                  <span className="text-slate-500">{u.email}</span>
                </span>
                <div className="flex items-center gap-2">
                  <strong className="app-chip">{u.role}</strong>
                  {user?.role === 'ADMIN' ? (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleSoftDeleteUser(u.id, u.name)}
                      disabled={deletingUserId === u.id}
                    >
                      {deletingUserId === u.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
            {users.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                Nenhum usuário encontrado.
              </li>
            ) : null}
          </ul>

          <div ref={sentinelRef} className="h-10" />
          {loadingMore ? (
            <p className="mt-2 text-center text-sm text-slate-500">
              Carregando mais usuários...
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
