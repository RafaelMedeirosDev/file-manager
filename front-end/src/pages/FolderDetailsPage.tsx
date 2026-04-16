import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { FileIcon, FolderIcon } from '../components/Icons';
import { useFolderDetails } from '../features/folders/hooks/useFolderDetails';

// ── Inline styles ─────────────────────────────────────────────────────────────

const FD_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

@keyframes fd-panel-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fd-card-in {
  from { opacity: 0; transform: translateY(6px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Toolbar ─────────────────────────────── */
.fd-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--shell-border);
  gap: 12px;
}

.fd-search-wrap {
  position: relative;
  flex: 0 0 auto;
}

.fd-search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
  flex-shrink: 0;
}

.fd-search-input {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 13px;
  color: #0d1e35;
  background: #f8fafc;
  border: 1px solid #e0e8f0;
  border-radius: 20px;
  padding: 7px 14px 7px 34px;
  width: 240px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s, width 0.2s;
}

.fd-search-input::placeholder { color: #94a3b8; }

.fd-search-input:focus {
  border-color: #0078D4;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.10);
  width: 300px;
}

.fd-item-badge {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 3px 10px;
  white-space: nowrap;
}

/* ── Actions toggle button ───────────────── */
.fd-actions-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #0078D4;
  background: #f0f7fe;
  border: 1px solid #cce4f7;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.fd-actions-toggle:hover {
  background: #e0f0fc;
  border-color: #0078D4;
}

.fd-actions-toggle.open {
  background: #0078D4;
  color: #fff;
  border-color: #0078D4;
}

/* ── Action panel ────────────────────────── */
.fd-action-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 16px 20px;
  background: #f7fafd;
  border-bottom: 1px solid #dde8f2;
  animation: fd-panel-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.fd-error-bar {
  grid-column: 1 / -1;
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 12px;
  color: #e11d48;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  padding: 8px 12px;
}

/* ── Action card ─────────────────────────── */
.fd-card {
  background: #ffffff;
  border: 1px solid #e0e8f2;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(13, 30, 53, 0.06), 0 0 0 0 transparent;
  transition: box-shadow 0.15s, border-color 0.15s;
  animation: fd-card-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.fd-card:nth-child(2) { animation-delay: 0.05s; }

.fd-card:focus-within {
  border-color: #0078D4;
  box-shadow: 0 2px 10px rgba(0, 120, 212, 0.10);
}

.fd-card-header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px 10px;
  border-bottom: 1px solid #f0f4f8;
  background: #fafbfc;
}

.fd-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #e8f3fb;
  color: #0078D4;
  flex-shrink: 0;
}

.fd-card-title {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #0d1e35;
  margin: 0;
  letter-spacing: 0.01em;
}

.fd-card-body {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}

.fd-card-input {
  flex: 1;
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 13px;
  color: #0d1e35;
  background: #f8fafc;
  border: 1px solid #e0e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  min-width: 0;
}

.fd-card-input::placeholder { color: #94a3b8; }

.fd-card-input:focus {
  border-color: #0078D4;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.08);
}

/* ── File pick zone ──────────────────────── */
.fd-file-zone {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1.5px dashed #d0dce8;
  border-radius: 8px;
  padding: 7px 12px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  flex-shrink: 0;
  min-width: 0;
}

.fd-file-zone:hover {
  border-color: #0078D4;
  background: #f0f7fe;
}

.fd-file-zone.has-file {
  border-color: #0078D4;
  border-style: solid;
  background: #f0f7fe;
}

.fd-file-zone input[type="file"] {
  display: none;
}

.fd-file-label {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #0078D4;
  white-space: nowrap;
}

.fd-file-name {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 11px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

/* ── Action buttons ──────────────────────── */
.fd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  background: #0078D4;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, opacity 0.12s, transform 0.1s;
  flex-shrink: 0;
}

.fd-btn:hover:not(:disabled) { background: #0063b1; }
.fd-btn:active:not(:disabled) { transform: scale(0.97); }
.fd-btn:disabled { opacity: 0.5; cursor: default; }

/* ── Drop overlay (appears only while dragging over the window) ── */
@keyframes fd-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes fd-drop-pulse {
  0%, 100% { border-color: #0078D4; box-shadow: 0 0 0 0 rgba(0,120,212,0.15); }
  50%       { border-color: #60b3f0; box-shadow: 0 0 0 8px rgba(0,120,212,0); }
}

.fd-drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(240, 247, 254, 0.88);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fd-overlay-in 0.15s ease both;
}

.fd-drop-zone {
  border: 2.5px dashed #0078D4;
  border-radius: 20px;
  padding: 56px 80px;
  background: #fff;
  cursor: pointer;
  outline: none;
  animation: fd-drop-pulse 1.4s infinite;
  box-shadow: 0 16px 48px rgba(0, 120, 212, 0.12);
}

.fd-drop-zone-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.fd-drop-icon {
  width: 56px;
  height: 56px;
  background: #0078D4;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 4px;
}

.fd-drop-title {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #0078D4;
  margin: 0;
}

.fd-drop-subtitle {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

/* ── Upload queue ────────────────────────────── */
.fd-queue {
  margin: 0 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fd-queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.fd-queue-label {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

@keyframes fd-item-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fd-queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #e8f0f8;
  border-radius: 9px;
  padding: 9px 12px;
  animation: fd-item-in 0.18s cubic-bezier(0.22,1,0.36,1) both;
}

.fd-queue-item.success { border-color: #bbf7d0; background: #f0fdf4; }
.fd-queue-item.error   { border-color: #fecdd3; background: #fff1f2; }

.fd-queue-file-icon {
  width: 28px;
  height: 28px;
  background: #e8f3fb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0078D4;
  flex-shrink: 0;
}

.fd-queue-file-icon.success { background: #dcfce7; color: #16a34a; }
.fd-queue-file-icon.error   { background: #ffe4e6; color: #e11d48; }

.fd-queue-name {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #0d1e35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.fd-queue-size {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 10px;
  color: #94a3b8;
  white-space: nowrap;
  flex-shrink: 0;
}

.fd-queue-status {
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.fd-queue-status.uploading { color: #0078D4; }
.fd-queue-status.success   { color: #16a34a; }
.fd-queue-status.error     { color: #e11d48; }

.fd-queue-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #cbd5e1;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
  flex-shrink: 0;
}

.fd-queue-remove:hover { color: #e11d48; background: #fff1f2; }

.fd-queue-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.fd-clear-btn {
  background: none;
  border: none;
  font-family: 'DM Sans', 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 5px;
  transition: color 0.12s, background 0.12s;
}

.fd-clear-btn:hover { color: #e11d48; background: #fff1f2; }

@media (max-width: 680px) {
  .fd-action-panel { grid-template-columns: 1fr; }
  .fd-search-input:focus { width: 240px; }
  .fd-drop-zone { margin: 10px 12px; }
  .fd-queue { margin: 0 12px 12px; }
}
`;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FolderDetailsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const [showActions, setShowActions] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dropInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const {
    folder, entries, loading, error, actionError,
    creatingFolder, downloadingFileId,
    newFolderName, setNewFolderName,
    searchTerm, setSearchTerm,
    uploadQueue, addFilesToQueue, removeFromQueue, clearQueue,
    handleBulkUpload, uploading,
    handleCreateSubFolder, handleDownload,
  } = useFolderDetails();

  const pendingCount = uploadQueue.filter((i) => i.status === 'pending').length;
  const hasQueue = uploadQueue.length > 0;

  // Show drop overlay when files are dragged over the window
  useEffect(() => {
    if (!isAdmin) return;

    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types.includes('Files')) return;
      dragCounterRef.current++;
      setIsDraggingOver(true);
    }

    function onDragLeave() {
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDraggingOver(false);
      }
    }

    function onDragOver(e: DragEvent) { e.preventDefault(); }

    function onDrop(e: DragEvent) {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) addFilesToQueue(files);
    }

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);

    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [isAdmin, addFilesToQueue]);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFilesToQueue(files);
    e.target.value = '';
  }

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
      <style>{FD_STYLES}</style>

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
        {isAdmin && (
          <button
            type="button"
            className={`fd-actions-toggle${showActions ? ' open' : ''}`}
            onClick={() => setShowActions((v) => !v)}
          >
            {showActions ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Fechar
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Ações
              </>
            )}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="fd-toolbar">
        <div className="fd-search-wrap">
          <svg className="fd-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="fd-search-input"
            placeholder="Buscar nesta pasta"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="fd-item-badge">
          {entries.length} item{entries.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Admin actions panel */}
      {isAdmin && showActions && (
        <div className="fd-action-panel">
          {actionError && <p className="fd-error-bar">{actionError}</p>}

          {/* Nova Subpasta */}
          <div className="fd-card">
            <div className="fd-card-header">
              <span className="fd-card-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <path d="M12 11v6M9 14h6" />
                </svg>
              </span>
              <p className="fd-card-title">Nova Subpasta</p>
            </div>
            <form className="fd-card-body" onSubmit={handleCreateSubFolder}>
              <input
                className="fd-card-input"
                placeholder="Nome da subpasta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
              />
              <button type="submit" className="fd-btn" disabled={creatingFolder}>
                {creatingFolder ? 'Criando…' : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Criar
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Upload de Arquivos */}
          <div className="fd-card">
            <div className="fd-card-header">
              <span className="fd-card-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <p className="fd-card-title">Upload de Arquivos</p>
            </div>
            <div className="fd-card-body" style={{ justifyContent: 'space-between' }}>
              <span
                style={{
                  fontFamily: "'DM Sans', 'Manrope', sans-serif",
                  fontSize: 12,
                  color: '#475569',
                }}
              >
                Adicione arquivos para envio em lote
              </span>
              <button
                type="button"
                className="fd-btn"
                onClick={() => dropInputRef.current?.click()}
                disabled={uploading}
              >
                + Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Drop overlay (ADMIN only, visible only while dragging) ── */}
      {isAdmin && (
        <>
          <input
            ref={dropInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={onPickFiles}
          />

          {isDraggingOver && (
            <div className="fd-drop-overlay">
              <div className="fd-drop-zone">
                <div className="fd-drop-zone-inner">
                  <div className="fd-drop-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="fd-drop-title">Solte os arquivos aqui</p>
                  <p className="fd-drop-subtitle">Múltiplos arquivos permitidos · Máximo 20 por vez</p>
                </div>
              </div>
            </div>
          )}

          {hasQueue && (
            <div className="fd-queue">
              <div className="fd-queue-header">
                <span className="fd-queue-label">{uploadQueue.length} arquivo{uploadQueue.length !== 1 ? 's' : ''} na fila</span>
              </div>

              {uploadQueue.map((item) => (
                <div key={item.localId} className={`fd-queue-item ${item.status}`}>
                  <div className={`fd-queue-file-icon ${item.status}`}>
                    {item.status === 'success' ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : item.status === 'error' ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="13 2 13 9 20 9" />
                      </svg>
                    )}
                  </div>

                  <span className="fd-queue-name">{item.file.name}</span>
                  <span className="fd-queue-size">{formatFileSize(item.file.size)}</span>

                  {item.status === 'uploading' && (
                    <span className="fd-queue-status uploading">Enviando…</span>
                  )}
                  {item.status === 'success' && (
                    <span className="fd-queue-status success">Enviado</span>
                  )}
                  {item.status === 'error' && (
                    <span className="fd-queue-status error" title={item.error}>Erro</span>
                  )}

                  {(item.status === 'pending' || item.status === 'error') && (
                    <button
                      type="button"
                      className="fd-queue-remove"
                      onClick={() => removeFromQueue(item.localId)}
                      aria-label={`Remover ${item.file.name}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              <div className="fd-queue-footer">
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="fd-clear-btn" onClick={clearQueue} disabled={uploading}>
                    Limpar fila
                  </button>
                  <button
                    type="button"
                    className="fd-clear-btn"
                    onClick={() => dropInputRef.current?.click()}
                    disabled={uploading}
                  >
                    + Adicionar
                  </button>
                </div>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    className="fd-btn"
                    onClick={handleBulkUpload}
                    disabled={uploading}
                  >
                    {uploading ? 'Enviando…' : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Enviar {pendingCount} arquivo{pendingCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
