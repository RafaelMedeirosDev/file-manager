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
      className={`h-3 w-3 flex-shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
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
      className={`h-4 w-4 flex-shrink-0 ${active ? 'text-brand-500' : 'text-amber-400'}`}
    >
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0-2-2h-8l-2-2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 flex-shrink-0 text-slate-400"
    >
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function FileNodeIcon({ extension }: { extension: string }) {
  const ext = extension.toLowerCase();

  const color =
    ext === 'pdf'                                        ? 'text-rose-500'    :
    ['jpg','jpeg','png','gif','webp','svg'].includes(ext) ? 'text-violet-500'  :
    ['xls','xlsx','csv'].includes(ext)                   ? 'text-emerald-600' :
    ['doc','docx','txt','md'].includes(ext)              ? 'text-sky-600'     :
                                                           'text-slate-400';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[14px] w-[14px] flex-shrink-0 ${color}`}
    >
      <path d="M7.8 3h7.4L20 7.8v11.4A1.8 1.8 0 0 1 18.2 21H7.8A1.8 1.8 0 0 1 6 19.2V4.8A1.8 1.8 0 0 1 7.8 3z" />
      <path d="M15.2 3v4.8H20" />
    </svg>
  );
}

// ── Tree components ──────────────────────────────────────

type FileTreeItemProps = {
  file: FileNode;
  depth: number;
};

function FileTreeItem({ file, depth }: FileTreeItemProps) {
  return (
    <div
      className="flex items-center rounded-[3px] text-slate-600 transition-colors duration-75 hover:bg-black/[0.04]"
      style={{ paddingLeft: `${4 + depth * 14 + 20}px`, paddingRight: '6px' }}
    >
      <div className="flex flex-1 items-center gap-1.5 overflow-hidden py-[3px] text-[12px]">
        <FileNodeIcon extension={file.extension} />
        <span className="truncate text-slate-500">
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
        className={`flex items-center rounded-[3px] transition-colors duration-75 ${
          isActive ? 'bg-[#cce4f7] text-[#003a6e]' : 'text-slate-700 hover:bg-black/[0.05]'
        }`}
        style={{ paddingLeft: `${4 + depth * 14}px`, paddingRight: '6px' }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void onToggle(node.id); }}
          className="flex h-6 w-5 flex-shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
          aria-label={isExpanded ? 'Recolher' : 'Expandir'}
        >
          <ChevronIcon expanded={isExpanded} />
        </button>

        <button
          type="button"
          onClick={() => onNavigate(node.id)}
          className="flex flex-1 items-center gap-1.5 overflow-hidden py-[3px] text-left text-[13px]"
        >
          <FolderFilledIcon active={isActive} />
          <span className="truncate">{node.name}</span>
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

// ── Sidebar ──────────────────────────────────────────────

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    roots,
    users,
    foldersByUserId,
    expandedUsers,
    handleToggleUser,
    expanded,
    loading,
    handleToggle,
  } = useSidebar();

  const activeFolderId = location.pathname.match(/^\/folders\/([^/]+)/)?.[1];
  const isFoldersRoot  = location.pathname === '/folders';
  const isAdmin = user?.role === 'ADMIN';

  function renderNodes(nodes: FolderNode[], depth = 0): React.ReactNode {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        node={node}
        depth={depth}
        isExpanded={expanded.has(node.id)}
        isActive={activeFolderId === node.id}
        onToggle={handleToggle}
        onNavigate={(id) => navigate(`/folders/${id}`)}
      >
        {renderNodes(node.children, depth + 1)}
      </TreeItem>
    ));
  }

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col overflow-hidden border-r border-[#e0e0e0] bg-[#f3f3f3]">
      <div className="flex-1 overflow-y-auto py-2 px-1.5">

        {/* ── USER: botão Início + suas pastas ─────────── */}
        {!isAdmin && (
          <>
            <button
              type="button"
              onClick={() => navigate('/folders')}
              className={`mb-1 flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-[13px] font-medium transition-colors duration-75 ${
                isFoldersRoot
                  ? 'bg-[#cce4f7] text-[#003a6e]'
                  : 'text-slate-600 hover:bg-black/[0.05]'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`h-4 w-4 flex-shrink-0 ${isFoldersRoot ? 'text-brand-500' : 'text-slate-400'}`}
              >
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              Início
            </button>

            <div className="mb-1 mt-2 px-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pastas
              </span>
            </div>

            {loading ? (
              <p className="px-3 py-2 text-xs text-slate-400">Carregando...</p>
            ) : roots.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">Nenhuma pasta.</p>
            ) : (
              renderNodes(roots)
            )}
          </>
        )}

        {/* ── ADMIN: acordeão de usuários ───────────────── */}
        {isAdmin && (
          <>
            <div className="mb-1 px-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Usuários
              </span>
            </div>

            {loading ? (
              <p className="px-3 py-2 text-xs text-slate-400">Carregando...</p>
            ) : users.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">Nenhum usuário.</p>
            ) : (
              users.map((u) => {
                const isExpanded = expandedUsers.has(u.id);
                const userFolders = foldersByUserId.get(u.id) ?? [];

                return (
                  <div key={u.id}>
                    {/* Cabeçalho do acordeão */}
                    <button
                      type="button"
                      onClick={() => handleToggleUser(u.id)}
                      className="flex w-full items-center gap-1.5 rounded-[3px] px-2 py-1.5 text-left text-[13px] text-slate-700 transition-colors duration-75 hover:bg-black/[0.05]"
                    >
                      <ChevronIcon expanded={isExpanded} />
                      <UserIcon />
                      <span className="truncate">{u.name}</span>
                    </button>

                    {/* Pastas raiz do usuário */}
                    {isExpanded && (
                      <div className="pb-1">
                        {userFolders.length === 0 ? (
                          <p className="px-6 py-1 text-[12px] text-slate-400">Sem pastas.</p>
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
