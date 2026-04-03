import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { FileIcon, FolderIcon } from '../components/Icons';
import { useFolderDetails } from '../features/folders/hooks/useFolderDetails';

export function FolderDetailsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const {
    folder, entries, loading, error, actionError,
    creatingFolder, downloadingFileId, uploadingFile,
    newFolderName, setNewFolderName,
    searchTerm, setSearchTerm,
    uploadFile, setUploadFile,
    uploadFileName, setUploadFileName,
    handleCreateSubFolder, handleDownload, handleUpload,
  } = useFolderDetails();

  const isAdmin = user?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="page-content">
        <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope, sans-serif' }}>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{error}</p>
      </div>
    );
  }

  if (!folder) return null;

  // Build breadcrumb subtitle
  const breadcrumb = [
    { label: 'Pastas', href: '/folders' },
    ...(folder.parent ? [{ label: folder.parent.name, href: `/folders/${folder.parent.id}` }] : []),
    { label: folder.name, href: null },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{folder.name}</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {breadcrumb.map((crumb, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: '#cbd5e1' }}>/</span>}
                {crumb.href ? (
                  <Link to={crumb.href} style={{ color: '#0078D4', textDecoration: 'none', fontWeight: 500 }}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: '#0d1e35', fontWeight: 600 }}>{crumb.label}</span>
                )}
              </span>
            ))}
          </p>
        </div>
        {isAdmin ? (
          <button type="button" className="btn-secondary" style={{ fontSize: 12, flexShrink: 0 }}
            onClick={() => setShowActions((v) => !v)}>
            {showActions ? '− Fechar' : '+ Ações'}
          </button>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar-left">
          <input
            className="app-input"
            style={{ maxWidth: 260 }}
            placeholder="Buscar nesta pasta"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="page-toolbar-right">
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#94a3b8' }}>
            {entries.length} item{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Admin actions panel */}
      {isAdmin && showActions ? (
        <div className="page-expand-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {actionError ? <p style={{ fontSize: 13, color: '#e11d48', fontFamily: 'Manrope, sans-serif' }}>{actionError}</p> : null}

          <form style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }} onSubmit={handleCreateSubFolder}>
            <input placeholder="Nome da nova subpasta" value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="app-input" required />
            <button type="submit" className="btn-primary" disabled={creatingFolder} style={{ fontSize: 12 }}>
              {creatingFolder ? 'Criando...' : '+ Subpasta'}
            </button>
          </form>

          <form style={{ display: 'grid', gap: 8, gridTemplateColumns: 'auto 1fr auto' }} onSubmit={handleUpload}>
            <input type="file" className="app-input" style={{ maxWidth: 220 }}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setUploadFile(file);
                if (file) setUploadFileName(file.name.replace(/\.[^.]+$/, ''));
              }} required />
            <input className="app-input" placeholder="Nome do arquivo"
              value={uploadFileName} onChange={(e) => setUploadFileName(e.target.value)} required />
            <button type="submit" className="btn-primary" disabled={uploadingFile || !uploadFile} style={{ fontSize: 12 }}>
              {uploadingFile ? 'Enviando...' : 'Upload'}
            </button>
          </form>
        </div>
      ) : null}

      {/* Content */}
      <div className="page-content">
        <div style={{ background: '#fff', border: '1px solid var(--shell-border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid var(--shell-border)' }}>
            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8' }}>
              Nome
            </span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {entries.map((entry) => (
              <li key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                {entry.type === 'folder' ? (
                  <button
                    type="button"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#0078D4', fontWeight: 600, fontSize: 13, fontFamily: 'Manrope, sans-serif', padding: 0 }}
                    onClick={() => navigate(`/folders/${entry.id}`)}
                  >
                    <FolderIcon className="h-4 w-4" style={{ color: '#0078D4' }} />
                    <span>{entry.name}</span>
                  </button>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155', fontFamily: 'Manrope, sans-serif' }}>
                    <FileIcon className="h-4 w-4 text-slate-400" />
                    <span>{entry.name}.{entry.extension}</span>
                  </span>
                )}

                {entry.type === 'file' ? (
                  <button
                    type="button"
                    className="download-btn"
                    disabled={downloadingFileId === entry.id}
                    onClick={() => handleDownload(entry.id, entry.name, entry.extension)}
                  >
                    {downloadingFileId === entry.id ? 'Baixando...' : 'Download'}
                  </button>
                ) : null}
              </li>
            ))}

            {entries.length === 0 ? (
              <li style={{ padding: '24px 16px', fontSize: 13, color: '#94a3b8', textAlign: 'center', fontFamily: 'Manrope, sans-serif' }}>
                Nenhum item encontrado nesta pasta.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </>
  );
}
