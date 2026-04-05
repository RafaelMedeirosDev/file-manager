import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { FolderIcon } from '../components/Icons';
import { useFolders } from '../features/folders/hooks/useFolders';
import { useSidebarContext } from '../features/folders/contexts/SidebarContext';

// ── Avatar helpers (mesmos do UsersPage) ─────────────────

const AV_CLASSES = ['av-blue', 'av-indigo', 'av-violet', 'av-green', 'av-amber', 'av-rose', 'av-teal', 'av-orange'];

function avatarClass(name: string): string {
  return AV_CLASSES[name.charCodeAt(0) % 8];
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

// ── Page ─────────────────────────────────────────────────

export function FoldersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedUserId, selectUser } = useSidebarContext();
  const [showDelete, setShowDelete] = useState(false);
  const {
    visibleFolders, usersOptions, usersById, folderById,
    loading, error, deletingFolderId,
    selectedDeleteFolderId, setSelectedDeleteFolderId,
    handleSoftDeleteFolder,
  } = useFolders();

  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pastas</h1>
          <p className="page-subtitle">Navegue e organize a estrutura de diretórios.</p>
        </div>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" className="btn-secondary" style={{ fontSize: 12 }}
              onClick={() => setShowDelete((v) => !v)}>
              {showDelete ? 'Fechar' : 'Excluir pasta'}
            </button>
            <button type="button" className="btn-primary" style={{ fontSize: 12 }}
              onClick={() => navigate('/folders/new')}>
              + Nova Pasta
            </button>
          </div>
        ) : null}
      </div>

      {/* Delete form panel */}
      {isAdmin && showDelete ? (
        <div className="page-expand-panel">
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }}>
            <select className="app-input" value={selectedDeleteFolderId}
              onChange={(e) => setSelectedDeleteFolderId(e.target.value)}>
              <option value="">Selecione uma pasta para excluir</option>
              {visibleFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
            <button type="button" className="btn-danger" disabled={deletingFolderId !== null}
              onClick={() => {
                if (!selectedDeleteFolderId) return;
                const folder = folderById.get(selectedDeleteFolderId);
                if (folder) void handleSoftDeleteFolder(folder.id, folder.name);
              }}>
              {deletingFolderId ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="page-content">

        {/* ── Grade de usuários (ADMIN) ── */}
        {isAdmin && usersOptions.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 12px 0' }}>
              Selecione um usuário
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {usersOptions.map((u) => {
                const isSelected = selectedUserId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectUser(isSelected ? null : u.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      border: `1.5px solid ${isSelected ? '#0078D4' : 'var(--shell-border)'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'border-color 0.12s, background 0.12s, box-shadow 0.12s',
                      boxShadow: isSelected ? '0 0 0 3px rgba(0,120,212,0.10)' : '0 1px 3px rgba(0,0,0,0.05)',
                      fontFamily: 'Manrope, sans-serif',
                    }}
                  >
                    <div className={`users-avatar ${avatarClass(u.name)}`} style={{ width: 32, height: 32, fontSize: 12 }}>
                      {avatarInitials(u.name)}
                    </div>
                    <span style={{
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#0078D4' : '#0d1e35',
                      whiteSpace: 'nowrap',
                    }}>
                      {u.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── Pastas do usuário selecionado ── */}
        {selectedUserId ? (
          <>
            {loading ? (
              <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>Carregando...</p>
            ) : error ? (
              <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{error}</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>
                    Pastas
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--shell-border)' }} />
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#94a3b8' }}>
                    {visibleFolders.length} pasta{visibleFolders.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
                  {visibleFolders.map((folder) => {
                    const ownerName = usersById.get(folder.userId) ?? 'Usuário desconhecido';
                    return (
                      <li key={folder.id}>
                        <Link
                          to={`/folders/${folder.id}`}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 110, background: '#fff', border: '1px solid var(--shell-border)', borderRadius: 8, padding: 12, textDecoration: 'none', textAlign: 'center', transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#0078D4'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 12px rgba(0,120,212,0.1)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--shell-border)'; (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
                        >
                          <FolderIcon className="h-8 w-8 text-brand-500" />
                          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 600, color: '#0d1e35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {folder.name}
                          </span>
                          {isAdmin ? (
                            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                              {ownerName}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                  {visibleFolders.length === 0 ? (
                    <li style={{ gridColumn: '1 / -1', border: '1px dashed #cbd5e1', borderRadius: 8, padding: 20, fontSize: 13, color: '#94a3b8', textAlign: 'center', fontFamily: 'Manrope, sans-serif' }}>
                      Nenhuma pasta encontrada.
                    </li>
                  ) : null}
                </ul>
              </>
            )}
          </>
        ) : null}

      </div>
    </>
  );
}
