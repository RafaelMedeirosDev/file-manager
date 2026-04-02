import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

// ── Types ────────────────────────────────────────────────

type SidebarContextValue = {
  sidebarVersion: number;
  refreshSidebar: () => void;
  expandedFolderIds: Set<string>;
  expandToFolder: (ancestorIds: string[]) => void;
};

// ── Context ──────────────────────────────────────────────

const SidebarContext = createContext<SidebarContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────

export function SidebarProvider({ children }: PropsWithChildren) {
  const [sidebarVersion, setSidebarVersion] = useState(0);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

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

  const value = useMemo<SidebarContextValue>(
    () => ({ sidebarVersion, refreshSidebar, expandedFolderIds, expandToFolder }),
    [sidebarVersion, refreshSidebar, expandedFolderIds, expandToFolder],
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
