import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

// ── Types ────────────────────────────────────────────────

type SidebarContextValue = {
  sidebarVersion: number;
  refreshSidebar: () => void;
};

// ── Context ──────────────────────────────────────────────

const SidebarContext = createContext<SidebarContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────

export function SidebarProvider({ children }: PropsWithChildren) {
  const [sidebarVersion, setSidebarVersion] = useState(0);

  const refreshSidebar = useCallback(() => {
    setSidebarVersion((v) => v + 1);
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({ sidebarVersion, refreshSidebar }),
    [sidebarVersion, refreshSidebar],
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
