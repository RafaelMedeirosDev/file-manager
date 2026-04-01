import { useCallback, useEffect, useState } from 'react';
import { foldersService } from '../services/foldersService';
import { folderDetailsService } from '../services/folderDetailsService';

// ── Types internos ───────────────────────────────────────

export type FileNode = {
  id: string;
  name: string;
  extension: string;
};

export type FolderNode = {
  id: string;
  name: string;
  children: FolderNode[];
  files: FileNode[];
  isLoaded: boolean;
};

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
  roots: FolderNode[];
  expanded: Set<string>;
  loading: boolean;
  handleToggle: (folderId: string) => Promise<void>;
};

// ── Hook ────────────────────────────────────────────────

export function useSidebar(): UseSidebarReturn {
  const [roots, setRoots] = useState<FolderNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ── Carga inicial das pastas raiz ────────────────────

  useEffect(() => {
    foldersService
      .list({ rootsOnly: true, limit: 100 })
      .then((raw) => {
        const items = Array.isArray(raw) ? raw : raw.data;
        setRoots(
          items.map((f) => ({ id: f.id, name: f.name, children: [], files: [], isLoaded: false })),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Lazy load de filhos + arquivos ───────────────────

  const loadChildren = useCallback(async (folderId: string) => {
    const data = await folderDetailsService.getById(folderId);

    const children: FolderNode[] = (data.children ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      children: [],
      files: [],
      isLoaded: false,
    }));

    const files: FileNode[] = (data.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      extension: f.extension,
    }));

    setRoots((prev) => updateNodeInTree(prev, folderId, children, files));
  }, []);

  // ── Toggle expand/collapse ───────────────────────────

  const handleToggle = useCallback(async (folderId: string) => {
    if (expanded.has(folderId)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    } else {
      setExpanded((prev) => new Set(prev).add(folderId));
      const node = findNode(roots, folderId);
      if (node && !node.isLoaded) await loadChildren(folderId);
    }
  }, [expanded, roots, loadChildren]);

  return { roots, expanded, loading, handleToggle };
}
