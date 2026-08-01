'use client';

import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import type { Trail } from '@testbed/data';

import { FilterBar } from './FilterBar';
import { TrailList } from './TrailList';

export type Filters = { query: string; region: string; difficulty: string };

const EMPTY_FILTERS: Filters = { query: '', region: 'all', difficulty: 'all' };

function TrailExplorerImpl({ trails, regions, difficulties }: {
  trails: Trail[];
  regions: string[];
  difficulties: string[];
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);

  // Typing does not block the expensive list re-filter.
  const deferredQuery = useDeferredValue(filters.query);

  const onFilterChange = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const onSelect = useCallback((slug: string) => {
    setSelected((prev) => (prev === slug ? null : slug));
  }, []);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return trails.filter((t) => {
      if (filters.region !== 'all' && t.region !== filters.region) return false;
      if (filters.difficulty !== 'all' && t.difficulty !== filters.difficulty) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [trails, deferredQuery, filters.region, filters.difficulty]);

  return (
    <section data-testid="trail-explorer">
      <FilterBar
        filters={filters}
        regions={regions}
        difficulties={difficulties}
        onFilterChange={onFilterChange}
      />
      <p className="trail-card__meta" data-testid="result-count">
        {visible.length} trails
      </p>
      <TrailList trails={visible} selected={selected} onSelect={onSelect} />
    </section>
  );
}

export const TrailExplorer = memo(TrailExplorerImpl);
