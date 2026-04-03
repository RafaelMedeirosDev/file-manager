import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { FolderIcon } from '../components/Icons';
import { useFolders } from '../features/folders/hooks/useFolders';
import { useSidebarContext } from '../features/folders/contexts/SidebarContext';

export function FoldersPage() {
  const { user } = useAuth();
  const { selectedUserId, setSelectedUserId } = useSidebarContext();
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const {
    visibleFolders, usersOptions, usersById, folderById,
    loading, loadingMore, error, createError, creating, deletingFolderId,
    selectedCreateUserId, setSelectedCreateUserId,
    selectedDeleteFolderId, setSelectedDeleteFolderId,
    newFolderName, setNewFolderName,
    handleCreateFolder, handleSoftDeleteFolder, sentinelRef,
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
              onClick={() => { setShowDelete((v) => !v); setShowCreate(false); }}>
              {showDelete ? 'Fechar' : 'Excluir pasta'}
            </button>
            <button type="button" className="btn-primary" style={{ fontSize: 12 }}
              onClick={() => { setShowCreate((v) => !v); setShowDelete(false); }}>
              {showCreate ? '− Fechar' : '+ Nova Pasta'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar-left">
          {isAdmin ? (
            <select
              className="app-input"
              style={{ maxWidth: 200 }}
              value={selectedUserId ?? ''}
              onChange={(e) => setSelectedUserId(e.target.value || null)}
            >
              <option value="">Selecione um usuário</option>
              {usersOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="page-toolbar-right">
          {selectedUserId ? (
            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#94a3b8' }}>
              {visibleFolders.length} pasta{visibleFolders.length !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      </div>

      {/* Create form panel */}
      {isAdmin && showCreate ? (
        <div className="page-expand-panel">
          <form style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr auto' }} onSubmit={handleCreateFolder}>
            <select className="app-input" value={selectedCreateUserId}
              onChange={(e) => setSelectedCreateUserId(e.target.value)} required>
              <option value="">Selecione o usuário</option>
              {usersOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name} ({option.email})</option>
              ))}
            </select>
            <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta" className="app-input" required />
            <button type="submit" disabled={creating} className="btn-primary" style={{ fontSize: 12 }}>
              {creating ? 'Criando...' : 'Criar'}
            </button>
          </form>
          {createError ? <p style={{ marginTop: 8, fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{createError}</p> : null}
        </div>
      ) : null}

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
        {!selectedUserId ? (
          <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>
            Selecione um usuário para ver as pastas.
          </p>
        ) : (
          <>
            {loading ? <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>Carregando...</p> : null}
            {error ? <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{error}</p> : null}

            {!loading && !error ? (
              <>
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

                <div ref={sentinelRef} style={{ height: 40 }} />
                {loadingMore ? (
                  <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>
                    Carregando mais pastas...
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
