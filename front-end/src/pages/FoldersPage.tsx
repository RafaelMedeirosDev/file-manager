import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { FolderIcon } from '../components/Icons';
import { useFolders } from '../features/folders/hooks/useFolders';
import { useSidebarContext } from '../features/folders/contexts/SidebarContext';

// ── Avatar helpers ────────────────────────────────────────

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

  // ── Combobox state ───────────────────────────────────────
  const [comboQuery, setComboQuery] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const selectedUser = usersOptions.find((u) => u.id === selectedUserId) ?? null;
  const filteredUsers = usersOptions.filter((u) =>
    u.name.toLowerCase().includes(comboQuery.toLowerCase()),
  );

  useEffect(() => {
    if (!comboOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
        setComboQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [comboOpen]);

  function handleComboFocus() {
    setComboOpen(true);
    setComboQuery('');
  }

  function handleSelectUser(id: string) {
    selectUser(id);
    setComboOpen(false);
    setComboQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    selectUser(null);
    setComboQuery('');
    setComboOpen(false);
  }

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

        {/* ── Combobox de seleção de usuário (ADMIN) ── */}
        {isAdmin && usersOptions.length > 0 ? (
          <div style={{ marginBottom: 24, maxWidth: 400 }} ref={comboRef}>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 8px 0' }}>
              Selecione um usuário
            </p>

            {/* Campo de busca */}
            <div style={{ position: 'relative' }}>
              {/* Avatar do selecionado (visível quando fechado) */}
              {selectedUser && !comboOpen && (
                <div
                  className={`users-avatar ${avatarClass(selectedUser.name)}`}
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26, fontSize: 10, zIndex: 1 }}
                >
                  {avatarInitials(selectedUser.name)}
                </div>
              )}

              {/* Ícone de busca (visível quando aberto ou sem seleção) */}
              {(!selectedUser || comboOpen) && (
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              )}

              <input
                type="text"
                value={comboOpen ? comboQuery : (selectedUser?.name ?? '')}
                placeholder="Buscar usuário..."
                onFocus={handleComboFocus}
                onChange={(e) => setComboQuery(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 13,
                  color: selectedUser && !comboOpen ? '#0078D4' : '#0d1e35',
                  fontWeight: selectedUser && !comboOpen ? 600 : 400,
                  background: selectedUser && !comboOpen ? '#eff6ff' : '#fff',
                  border: `1.5px solid ${comboOpen ? '#0078D4' : selectedUser ? '#0078D4' : '#e0e8f0'}`,
                  borderRadius: 10,
                  padding: '10px 36px 10px 42px',
                  outline: 'none',
                  boxShadow: comboOpen ? '0 0 0 3px rgba(0,120,212,0.10)' : selectedUser ? '0 0 0 3px rgba(0,120,212,0.08)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                  cursor: 'text',
                  boxSizing: 'border-box',
                }}
              />

              {/* Botão limpar */}
              {selectedUser && !comboOpen && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 4 }}
                  title="Limpar seleção"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Chevron */}
              {!selectedUser && !comboOpen && (
                <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </div>

            {/* Dropdown */}
            {comboOpen && (
              <div style={{
                position: 'absolute',
                zIndex: 100,
                width: 400,
                marginTop: 4,
                background: '#fff',
                border: '1px solid #e0e8f0',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(13,30,53,0.12), 0 2px 6px rgba(13,30,53,0.06)',
                overflow: 'hidden',
                maxHeight: 280,
                overflowY: 'auto',
              }}>
                {filteredUsers.length === 0 ? (
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#94a3b8', padding: '16px 16px', margin: 0, textAlign: 'center' }}>
                    Nenhum usuário encontrado.
                  </p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectUser(u.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #f4f7fa',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                        fontFamily: 'Manrope, sans-serif',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f0f7fe'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                    >
                      <div className={`users-avatar ${avatarClass(u.name)}`} style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                        {avatarInitials(u.name)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0d1e35' }}>
                        {u.name}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
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
