import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useSidebarContext } from '../contexts/SidebarContext';
import { foldersService } from '../services/foldersService';
import { folderDetailsService } from '../services/folderDetailsService';
import { usersService } from '../../users/services/usersService';
import { normalizePaginatedResponse } from '../../../shared/utils/apiUtils';
import type { FolderItem, UserOption } from '../../../shared/types';

// ── Types internos ───────────────────────────────────────

export type FileNode = {
  id: string;
  name: string;
  extension: string;
};

export type FolderNode = {
  id: string;
  name: string;
  userId: string;
  children: FolderNode[];
  files: FileNode[];
  isLoaded: boolean;
};

// ── Paginação: busca todas as páginas de pastas raiz ─────

async function fetchAllRootFolders(): Promise<FolderItem[]> {
  const all: FolderItem[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const raw = await foldersService.list({ rootsOnly: true, limit: 100, page });
    const { items, meta } = normalizePaginatedResponse<FolderItem>(raw, page, 100);
    all.push(...items);
    hasNextPage = meta.hasNextPage;
    page += 1;
  }

  return all;
}

// ── Tree helpers ─────────────────────────────────────────

function updateNodeInTree(
  nodes: FolderNode[],
  targetId: string,
  children: FolderNode[],
  files: FileNode[],
): FolderNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) return { ...node, children, files, isLoaded: true };
    return {
      ...node,
      children: updateNodeInTree(node.children, targetId, children, files),
    };
  });
}

function findNodeInMap(
  map: Map<string, FolderNode[]>,
  id: string,
): FolderNode | null {
  for (const nodes of map.values()) {
    const found = findNode(nodes, id);
    if (found) return found;
  }
  return null;
}

function findNode(nodes: FolderNode[], id: string): FolderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

// ── Return type ──────────────────────────────────────────

export type UseSidebarReturn = {
  // USER: lista plana de pastas raiz
  roots: FolderNode[];

  // ADMIN: usuários + pastas agrupadas por userId
  users: UserOption[];
  foldersByUserId: Map<string, FolderNode[]>;
  expandedUsers: Set<string>;
  handleToggleUser: (userId: string) => void;

  // Compartilhado
  expanded: Set<string>;
  loading: boolean;
  handleToggle: (folderId: string) => Promise<void>;
};

// ── Hook ────────────────────────────────────────────────

export function useSidebar(): UseSidebarReturn {
  const { user } = useAuth();
  const { sidebarVersion, expandedFolderIds, expandToFolder, collapseFolder, expandedUsers, selectUser } = useSidebarContext();
  const isAdmin = user?.role === 'ADMIN';

  // ── Estado USER ──────────────────────────────────────
  const [roots, setRoots] = useState<FolderNode[]>([]);

  // ── Estado ADMIN ─────────────────────────────────────
  const [users, setUsers] = useState<UserOption[]>([]);
  const [foldersByUserId, setFoldersByUserId] = useState<Map<string, FolderNode[]>>(new Map());

  const [loading, setLoading] = useState(true);

  // ── Carga inicial (re-executa quando sidebarVersion muda) ──

  useEffect(() => {
    setLoading(true);

    if (isAdmin) {
      Promise.all([
        usersService.list({ limit: 100 }),
        fetchAllRootFolders(),
      ])
        .then(([usersRaw, folderItems]) => {
          const userItems = Array.isArray(usersRaw) ? usersRaw : usersRaw.data;

          setUsers(
            userItems.map((u) => ({ id: u.id, name: u.name, email: u.email })),
          );

          const grouped = new Map<string, FolderNode[]>();
          for (const u of userItems) grouped.set(u.id, []);

          for (const f of folderItems) {
            const list = grouped.get(f.userId);
            if (list) {
              list.push({ id: f.id, name: f.name, userId: f.userId, children: [], files: [], isLoaded: false });
            }
          }

          setFoldersByUserId(grouped);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      foldersService
        .list({ rootsOnly: true, limit: 100 })
        .then((raw) => {
          const items = Array.isArray(raw) ? raw : raw.data;
          setRoots(
            items.map((f) => ({ id: f.id, name: f.name, userId: f.userId, children: [], files: [], isLoaded: false })),
          );
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isAdmin, sidebarVersion]);

  // ── Lazy load de filhos + arquivos ───────────────────

  const loadChildren = useCallback(async (folderId: string) => {
    const data = await folderDetailsService.getById(folderId);

    const children: FolderNode[] = (data.children ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      userId: c.userId,
      children: [],
      files: [],
      isLoaded: false,
    }));

    const files: FileNode[] = (data.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      extension: f.extension,
    }));

    if (isAdmin) {
      setFoldersByUserId((prev) => {
        const next = new Map(prev);
        for (const [userId, nodes] of next) {
          next.set(userId, updateNodeInTree(nodes, folderId, children, files));
        }
        return next;
      });
    } else {
      setRoots((prev) => updateNodeInTree(prev, folderId, children, files));
    }
  }, [isAdmin]);

  // ── Auto-load filhos para IDs expandidos via Context ─

  useEffect(() => {
    if (loading) return;

    const unloadedIds = [...expandedFolderIds].filter((folderId) => {
      const node = isAdmin
        ? findNodeInMap(foldersByUserId, folderId)
        : findNode(roots, folderId);
      return node && !node.isLoaded;
    });

    for (const folderId of unloadedIds) {
      void loadChildren(folderId);
    }
  }, [expandedFolderIds, loading, isAdmin, foldersByUserId, roots, loadChildren]);

  // ── Toggle expand/collapse de pasta ─────────────────

  const handleToggle = useCallback(async (folderId: string) => {
    if (expandedFolderIds.has(folderId)) {
      collapseFolder(folderId);
    } else {
      expandToFolder([folderId]);

      const node = isAdmin
        ? findNodeInMap(foldersByUserId, folderId)
        : findNode(roots, folderId);

      if (node && !node.isLoaded) await loadChildren(folderId);
    }
  }, [expandedFolderIds, expandToFolder, collapseFolder, roots, foldersByUserId, isAdmin, loadChildren]);

  // ── Toggle expand/collapse de usuário (ADMIN) ────────

  const handleToggleUser = useCallback((userId: string) => {
    selectUser(expandedUsers.has(userId) ? null : userId);
  }, [expandedUsers, selectUser]);

  return {
    roots,
    users,
    foldersByUserId,
    expandedUsers,
    handleToggleUser,
    expanded: expandedFolderIds,
    loading,
    handleToggle,
  };
}
