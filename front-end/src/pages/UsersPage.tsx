import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { EditUserModal } from '../features/users/components/EditUserModal';
import { useUsers } from '../features/users/hooks/useUsers';

// ── Paginação ─────────────────────────────────────────────

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  )
    pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function Pagination({
  page,
  totalPages,
  totalUsers,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalUsers: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = buildPages(page, totalPages);
  const from = (page - 1) * 10 + 1;
  const to = Math.min(page * 10, totalUsers);

  return (
    <div className="pagination">
      <span className="pagination-info">
        {from}–{to} de {totalUsers} usuário{totalUsers !== 1 ? 's' : ''}
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="pagination-btn-label" style={{ marginLeft: 4 }}>
            Anterior
          </span>
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`pagination-btn${p === page ? ' active' : ''}`}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          ),
        )}

        <button
          className="pagination-btn"
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
        >
          <span className="pagination-btn-label" style={{ marginRight: 4 }}>
            Próxima
          </span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const AVATAR_COLORS = [
  'av-blue',
  'av-indigo',
  'av-violet',
  'av-teal',
  'av-amber',
  'av-rose',
  'av-green',
  'av-orange',
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
    <svg
      width="14"
      height="14"
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

function EmptySearchIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="M8 11h6" opacity="0.5" />
    </svg>
  );
}

// Icones locais, seguindo a convencao do arquivo (SearchIcon acima) e o traco
// do components/Icons.tsx: viewBox 24, stroke currentColor, pontas redondas.
function EditIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export function UsersPage() {
  const { user } = useAuth();
  const {
    users,
    totalUsers,
    loading,
    error,
    actionError,
    deletingUserId,
    searchTerm,
    setSearchTerm,
    page,
    totalPages,
    goToPage,
    handleSoftDeleteUser,
    editingUser,
    openEditUser,
    closeEditUser,
    handleUserSaved,
  } = useUsers();

  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  return (
    <>
      {/* Page Header */}
      <div
        className="page-header"
        style={{ paddingBottom: 4, flexWrap: 'wrap' }}
      >
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">
            Gerencie contas, permissões e acesso ao workspace.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: 12, padding: '7px 12px', flexShrink: 0 }}
            onClick={() => navigate('/users/new')}
          >
            + Novo usuário
          </button>
        ) : null}
      </div>

      {/* Content */}
      <div className="page-content">
        {error ? (
          <p
            style={{
              fontSize: 13,
              color: '#e11d48',
              fontFamily: 'Manrope, sans-serif',
              marginBottom: 12,
            }}
          >
            {error}
          </p>
        ) : null}
        {actionError ? (
          <p
            style={{
              fontSize: 13,
              color: '#e11d48',
              fontFamily: 'Manrope, sans-serif',
              marginBottom: 12,
            }}
          >
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
              {loading
                ? '…'
                : `${totalUsers} usuário${totalUsers !== 1 ? 's' : ''}`}
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
                      <p className="users-name">
                        {/* Link de verdade, e nao a linha inteira clicavel:
                            funciona por teclado sem role/tabIndex/onKeyDown,
                            abre em nova aba com Ctrl+clique, e nao disputa o
                            clique com os botoes de icone ao lado -- que sem
                            isso precisariam de stopPropagation para excluir
                            um usuario nao navegar junto. */}
                        <Link
                          className="users-name-link"
                          to={`/folders?userId=${u.id}`}
                        >
                          {u.name}
                        </Link>
                      </p>
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
                        className="users-btn-icon"
                        // Sem texto nao ha nome acessivel: o aria-label passa
                        // a ser obrigatorio, e o title devolve por tooltip o
                        // rotulo que o icone tirou.
                        aria-label={`Editar ${u.name}`}
                        title="Editar"
                        onClick={() => openEditUser(u)}
                      >
                        <EditIcon />
                      </button>
                    ) : null}
                    {isAdmin && u.id !== user?.id ? (
                      <button
                        type="button"
                        className="users-btn-icon users-btn-icon-danger"
                        aria-label={`Excluir ${u.name}`}
                        title="Excluir"
                        // Sem rotulo textual nao ha para onde trocar "Excluir"
                        // por "Excluindo...": o estado em curso vira o botao
                        // desabilitado mais o aria-busy.
                        aria-busy={deletingUserId === u.id}
                        onClick={() => handleSoftDeleteUser(u.id, u.name)}
                        disabled={deletingUserId === u.id}
                      >
                        <TrashIcon />
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
            <div
              style={{
                padding: '24px 20px',
                fontFamily: 'Manrope, sans-serif',
                fontSize: 13,
                color: '#94a3b8',
              }}
            >
              Carregando...
            </div>
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalUsers={totalUsers}
          onPage={goToPage}
        />
      </div>

      {/* Montado so enquanto ha alguem em edicao: e o mount/unmount que zera o
          formulario ao trocar de usuario, sem efeito de sincronizacao. */}
      {editingUser ? (
        <EditUserModal
          user={editingUser}
          isSelf={editingUser.id === user?.id}
          onClose={closeEditUser}
          onSaved={handleUserSaved}
        />
      ) : null}
    </>
  );
}
