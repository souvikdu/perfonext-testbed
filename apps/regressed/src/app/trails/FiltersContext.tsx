'use client';

// R2 DEFECT: the context value is a fresh object literal on every render of the
// provider, so every consumer re-renders whenever ANY provider state changes —
// even consumers that only read a field which did not change.

import { createContext, useContext, useState, type ReactNode } from 'react';

export type Filters = { query: string; region: string; difficulty: string };

type FiltersValue = {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  selected: string | null;
  setSelected: (slug: string | null) => void;
  stats: { renders: number; lastQuery: string };
};

const FiltersContext = createContext<FiltersValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>({ query: '', region: 'all', difficulty: 'all' });
  const [selected, setSelected] = useState<string | null>(null);
  const [renders, setRenders] = useState(0);

  // Recreated every render — no useMemo, no useCallback.
  const value: FiltersValue = {
    filters,
    setFilters: (patch) => setFiltersState({ ...filters, ...patch }),
    selected,
    setSelected,
    stats: { renders: renders + 1, lastQuery: filters.query },
  };

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used inside FiltersProvider');
  return ctx;
}
