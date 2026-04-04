import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

// ── Types ────────────────────────────────────────────────

type SidebarContextValue = {
  sidebarVersion: number;
  refreshSidebar: () => void;
  expandedFolderIds: Set<string>;
  expandToFolder: (ancestorIds: string[]) => void;
  collapseFolder: (folderId: string) => void;
  expandedUsers: Set<string>;
  expandUser: (userId: string) => void;
  toggleUser: (userId: string) => void;
  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;
  selectUser: (id: string | null) => void;
};

// ── Context ──────────────────────────────────────────────

const SidebarContext = createContext<SidebarContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────

export function SidebarProvider({ children }: PropsWithChildren) {
  const [sidebarVersion, setSidebarVersion] = useState(0);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const refreshSidebar = useCallback(() => {
    setSidebarVersion((v) => v + 1);
  }, []);

  const expandToFolder = useCallback((ancestorIds: string[]) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      for (const id of ancestorIds) next.add(id);
      return next;
    });
  }, []);

  const collapseFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
  }, []);

  const expandUser = useCallback((userId: string) => {
    setExpandedUsers((prev) => {
      if (prev.has(userId)) return prev;
      return new Set(prev).add(userId);
    });
  }, []);

  const selectUser = useCallback((id: string | null) => {
    if (id !== null) {
      setExpandedUsers(new Set([id]));
      setSelectedUserId(id);
    } else {
      setExpandedUsers(new Set());
      setSelectedUserId(null);
    }
  }, []);

  const toggleUser = useCallback((userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      sidebarVersion,
      refreshSidebar,
      expandedFolderIds,
      expandToFolder,
      collapseFolder,
      expandedUsers,
      expandUser,
      toggleUser,
      selectedUserId,
      setSelectedUserId,
      selectUser,
    }),
    [sidebarVersion, refreshSidebar, expandedFolderIds, expandToFolder, collapseFolder, expandedUsers, expandUser, toggleUser, selectedUserId, setSelectedUserId, selectUser],
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────

export function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebarContext must be used inside SidebarProvider');
  }

  return context;
}
