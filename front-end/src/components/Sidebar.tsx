import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useSidebar } from '../features/folders/hooks/useSidebar';
import type { FolderNode, FileNode } from '../features/folders/hooks/useSidebar';

// ── Icons ────────────────────────────────────────────────

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{
        width: 12, height: 12, flexShrink: 0, transition: 'transform 150ms',
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        color: 'rgba(255,255,255,0.3)',
      }}
    >
      <path d="M10 6L16 12L10 18V6Z" />
    </svg>
  );
}

function FolderFilledIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ width: 15, height: 15, flexShrink: 0, color: active ? '#0078D4' : 'rgba(255,200,80,0.75)' }}
    >
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0, color: 'rgba(255,255,255,0.3)' }}>
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor"
      style={{ width: 15, height: 15, flexShrink: 0, color: active ? '#0078D4' : 'rgba(255,255,255,0.4)' }}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function FileNodeIcon({ extension }: { extension: string }) {
  const ext = extension.toLowerCase();

  const color =
    ext === 'pdf'                                         ? 'rgba(251,113,133,0.8)'  :
    ['jpg','jpeg','png','gif','webp','svg'].includes(ext) ? 'rgba(167,139,250,0.8)'  :
    ['xls','xlsx','csv'].includes(ext)                   ? 'rgba(52,211,153,0.8)'   :
    ['doc','docx','txt','md'].includes(ext)              ? 'rgba(56,189,248,0.8)'   :
                                                           'rgba(255,255,255,0.3)';

  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 13, height: 13, flexShrink: 0, color }}
    >
      <path d="M7.8 3h7.4L20 7.8v11.4A1.8 1.8 0 0 1 18.2 21H7.8A1.8 1.8 0 0 1 6 19.2V4.8A1.8 1.8 0 0 1 7.8 3z" />
      <path d="M15.2 3v4.8H20" />
    </svg>
  );
}

// ── Dot grid overlay ─────────────────────────────────────

function DotGridPattern() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none' }}>
      <defs>
        <pattern id="sb-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="#0078D4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sb-dots)" />
    </svg>
  );
}

// ── Tree item styles ─────────────────────────────────────

const treeItemBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', borderRadius: 3,
  transition: 'background 75ms',
  borderLeft: '2px solid transparent',
};

function treeItemStyle(isActive: boolean): React.CSSProperties {
  return {
    ...treeItemBase,
    background: isActive ? 'rgba(0,120,212,0.14)' : 'transparent',
    borderLeftColor: isActive ? '#0078D4' : 'transparent',
    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
  };
}

// ── Tree components ──────────────────────────────────────

type FileTreeItemProps = { file: FileNode; depth: number };

function FileTreeItem({ file, depth }: FileTreeItemProps) {
  return (
    <div style={{ paddingLeft: `${4 + depth * 14 + 20}px`, paddingRight: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12 }}>
        <FileNodeIcon extension={file.extension} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>
          {file.name}.{file.extension}
        </span>
      </div>
    </div>
  );
}

type TreeItemProps = {
  node: FolderNode;
  depth: number;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: (id: string) => Promise<void>;
  onNavigate: (id: string) => void;
  children?: React.ReactNode;
};

function TreeItem({ node, depth, isExpanded, isActive, onToggle, onNavigate, children }: TreeItemProps) {
  return (
    <div>
      <div
        style={{ ...treeItemStyle(isActive), paddingLeft: `${4 + depth * 14}px`, paddingRight: 6 }}
        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void onToggle(node.id); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 24, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label={isExpanded ? 'Recolher' : 'Expandir'}
        >
          <ChevronIcon expanded={isExpanded} />
        </button>

        <button
          type="button"
          onClick={() => onNavigate(node.id)}
          style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 6, padding: '3px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', overflow: 'hidden', fontSize: 13, color: 'inherit' }}
        >
          <FolderFilledIcon active={isActive} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Manrope, sans-serif', fontWeight: isActive ? 600 : 400 }}>
            {node.name}
          </span>
        </button>
      </div>

      {isExpanded && (
        <div>
          {children}
          {node.files.map((file) => (
            <FileTreeItem key={file.id} file={file} depth={depth} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ícones para a nav mobile ─────────────────────────────

function UsersNavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0, color: 'rgba(255,255,255,0.4)' }}>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function ExamNavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 15, height: 15, flexShrink: 0, color: 'rgba(255,255,255,0.4)' }}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function FolderNavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor"
      style={{ width: 15, height: 15, flexShrink: 0, color: 'rgba(255,255,255,0.4)' }}>
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
  );
}

// ── Sidebar ──────────────────────────────────────────────

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    roots, users, foldersByUserId, expandedUsers, handleToggleUser,
    expanded, loading, handleToggle,
  } = useSidebar();

  const activeFolderId = location.pathname.match(/^\/folders\/([^/]+)/)?.[1];
  const isFoldersRoot  = location.pathname === '/folders';
  const isUsersPage    = location.pathname.startsWith('/users');
  const isExamsPage    = location.pathname.startsWith('/exam-requests');
  const isAdmin = user?.role === 'ADMIN';

  function navigate2(path: string) {
    navigate(path);
    onClose();
  }

  function renderNodes(nodes: FolderNode[], depth = 0): React.ReactNode {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        node={node}
        depth={depth}
        isExpanded={expanded.has(node.id)}
        isActive={activeFolderId === node.id}
        onToggle={handleToggle}
        onNavigate={(id) => navigate2(`/folders/${id}`)}
      >
        {renderNodes(node.children, depth + 1)}
      </TreeItem>
    ));
  }

  return (
    <aside className={`app-sidebar${isOpen ? ' open' : ''}`}>
      <DotGridPattern />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '12px 8px' }}>

        {/* ── Nav mobile para ADMIN (só visível em mobile via CSS) ── */}
        {isAdmin && (
          <div className="sb-mobile-nav">
            <span className="sb-section-label">Navegação</span>
            <button type="button" className={`sb-item${isUsersPage ? ' active' : ''}`}
              onClick={() => navigate2('/users')}>
              <UsersNavIcon />
              Usuários
            </button>
            <button type="button" className={`sb-item${isFoldersRoot ? ' active' : ''}`}
              onClick={() => navigate2('/folders')}>
              <FolderNavIcon />
              Pastas
            </button>
            <button type="button" className={`sb-item${isExamsPage ? ' active' : ''}`}
              onClick={() => navigate2('/exam-requests')}>
              <ExamNavIcon />
              Solicitações
            </button>
          </div>
        )}

        {/* ── USER: Início + folder tree ── */}
        {!isAdmin && (
          <>
            <button
              type="button"
              onClick={() => navigate2('/folders')}
              className={`sb-item${isFoldersRoot ? ' active' : ''}`}
            >
              <HomeIcon active={isFoldersRoot} />
              Início
            </button>

            <span className="sb-section-label">Pastas</span>

            {loading ? (
              <p style={{ padding: '8px 10px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Carregando...</p>
            ) : roots.length === 0 ? (
              <p style={{ padding: '8px 10px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Nenhuma pasta.</p>
            ) : (
              renderNodes(roots)
            )}
          </>
        )}

        {/* ── ADMIN: user accordion ── */}
        {isAdmin && (
          <>
            <span className="sb-section-label">Usuários</span>

            {loading ? (
              <p style={{ padding: '8px 10px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Carregando...</p>
            ) : users.length === 0 ? (
              <p style={{ padding: '8px 10px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Nenhum usuário.</p>
            ) : (
              users.map((u) => {
                const isExpanded = expandedUsers.has(u.id);
                const userFolders = foldersByUserId.get(u.id) ?? [];

                return (
                  <div key={u.id}>
                    <button
                      type="button"
                      onClick={() => handleToggleUser(u.id)}
                      className="sb-item"
                      style={{ paddingLeft: 8 }}
                    >
                      <ChevronIcon expanded={isExpanded} />
                      <UserIcon />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                        {u.name}
                      </span>
                    </button>

                    {isExpanded && (
                      <div style={{ paddingBottom: 4 }}>
                        {userFolders.length === 0 ? (
                          <p style={{ padding: '4px 24px', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Sem pastas.</p>
                        ) : (
                          renderNodes(userFolders, 1)
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

      </div>
    </aside>
  );
}
