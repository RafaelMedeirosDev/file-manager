import { useState } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { FileIcon } from '../components/Icons';
import { useFiles } from '../features/files/hooks/useFiles';

export function FilesPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const {
    visibleFiles, usersOptions, usersById, foldersById,
    createFolders, filterFolders, extensionOptions,
    loading, loadingMore, error, actionError, creatingFile,
    downloadingFileId, deletingFileId,
    filterUserId, setFilterUserId,
    filterFolderId, setFilterFolderId,
    filterFileName, setFilterFileName,
    filterExtension, setFilterExtension,
    selectedUserId, setSelectedUserId,
    selectedFolderId, setSelectedFolderId,
    newFileName, setNewFileName,
    newFileExtension, setNewFileExtension,
    newFileUrl, setNewFileUrl,
    handleCreateFile, handleDownload, handleSoftDeleteFile,
    sentinelRef,
  } = useFiles();

  const isAdmin = user?.role === 'ADMIN';
  const hasFilter = filterUserId || filterFolderId || filterFileName || filterExtension;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Arquivos</h1>
          <p className="page-subtitle">Filtre, baixe e gerencie documentos.</p>
        </div>
        {isAdmin ? (
          <button type="button" className="btn-primary" style={{ fontSize: 12, flexShrink: 0 }}
            onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? '− Fechar' : '+ Novo Arquivo'}
          </button>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar-left">
          {isAdmin ? (
            <select className="app-input" style={{ maxWidth: 160 }} value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}>
              <option value="">Todos os usuários</option>
              {usersOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          ) : null}

          <select className="app-input" style={{ maxWidth: 160 }} value={filterFolderId}
            onChange={(e) => setFilterFolderId(e.target.value)}>
            <option value="">Todas as pastas</option>
            {filterFolders.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>

          <input className="app-input" style={{ maxWidth: 180 }} value={filterFileName}
            onChange={(e) => setFilterFileName(e.target.value)} placeholder="Buscar por nome" />

          <select className="app-input" style={{ maxWidth: 130 }} value={filterExtension}
            onChange={(e) => setFilterExtension(e.target.value)}>
            <option value="">Extensão</option>
            {extensionOptions.map((ext) => (
              <option key={ext} value={ext}>{ext}</option>
            ))}
          </select>

          {hasFilter ? (
            <button type="button" className="btn-secondary" style={{ fontSize: 12 }}
              onClick={() => { setFilterUserId(''); setFilterFolderId(''); setFilterFileName(''); setFilterExtension(''); }}>
              Limpar
            </button>
          ) : null}
        </div>
        <div className="page-toolbar-right">
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#94a3b8' }}>
            {visibleFiles.length} arquivo{visibleFiles.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Create form panel */}
      {isAdmin && showCreate ? (
        <div className="page-expand-panel">
          <form style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr)) auto' }}
            onSubmit={handleCreateFile}>
            <select className="app-input" value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)} required>
              <option value="">Selecione o usuário</option>
              {usersOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name} ({option.email})</option>
              ))}
            </select>
            <select className="app-input" value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)} required>
              <option value="">Selecione a pasta</option>
              {createFolders.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
            <input value={newFileName} onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Nome do arquivo" className="app-input" required />
            <input value={newFileExtension} onChange={(e) => setNewFileExtension(e.target.value)}
              placeholder="Extensão (ex: pdf)" className="app-input" required />
            <input value={newFileUrl} onChange={(e) => setNewFileUrl(e.target.value)}
              placeholder="URL do arquivo" className="app-input" required />
            <button type="submit" className="btn-primary" disabled={creatingFile} style={{ fontSize: 12 }}>
              {creatingFile ? 'Criando...' : 'Criar'}
            </button>
          </form>
          {actionError ? <p style={{ marginTop: 8, fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{actionError}</p> : null}
        </div>
      ) : null}

      {/* Content */}
      <div className="page-content">
        {loading ? <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>Carregando...</p> : null}
        {error ? <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{error}</p> : null}
        {!isAdmin && actionError ? <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif', marginBottom: 12 }}>{actionError}</p> : null}

        {!loading && !error ? (
          <>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleFiles.map((file) => {
                const ownerName  = usersById.get(file.userId)    ?? 'Usuário desconhecido';
                const folderName = file.folderId
                  ? (foldersById.get(file.folderId) ?? 'Pasta desconhecida')
                  : 'Sem pasta';

                return (
                  <li key={file.id} className="app-list-item">
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileIcon className="h-4 w-4 text-slate-500" />
                        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 600, color: '#0d1e35' }}>
                          {file.name}.{file.extension}
                        </span>
                      </span>
                      {isAdmin ? (
                        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#94a3b8' }}>
                          {ownerName} · {folderName}
                        </span>
                      ) : null}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                      {isAdmin ? (
                        <button type="button" className="btn-danger"
                          disabled={deletingFileId === file.id}
                          onClick={() => handleSoftDeleteFile(file.id, `${file.name}.${file.extension}`)}>
                          {deletingFileId === file.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      ) : null}
                      <button type="button" className="download-btn"
                        disabled={downloadingFileId === file.id}
                        onClick={() => handleDownload(file.id, file.name, file.extension)}>
                        {downloadingFileId === file.id ? 'Baixando...' : 'Download'}
                      </button>
                    </div>
                  </li>
                );
              })}

              {visibleFiles.length === 0 ? (
                <li style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: 20, fontSize: 13, color: '#94a3b8', textAlign: 'center', fontFamily: 'Manrope, sans-serif' }}>
                  Nenhum arquivo encontrado.
                </li>
              ) : null}
            </ul>

            <div ref={sentinelRef} style={{ height: 40 }} />
            {loadingMore ? (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>
                Carregando mais arquivos...
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
