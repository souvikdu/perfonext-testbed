'use client';

// R1 + R3 + R5 DEFECTS.
//   R1 — every child receives a freshly-allocated object/array/arrow prop.
//   R3 — the search query lives here, so one keystroke re-renders the whole subtree.
//   R5 — a setState inside useEffect turns each commit into a nested update.
// No memo anywhere. apps/baseline is the same component tree with memo + useCallback
// + useMemo + useDeferredValue.

import { useEffect, useState } from 'react';
import type { Trail } from '@testbed/data';

import { FiltersProvider, useFilters } from './FiltersContext';
import { FilterBar } from './FilterBar';
import { TrailList } from './TrailList';

function ExplorerBody({
  trails,
  regions,
  difficulties,
}: {
  trails: Trail[];
  regions: string[];
  difficulties: string[];
}) {
  const { filters, setFilters, selected, setSelected } = useFilters();
  const [visibleCount, setVisibleCount] = useState(0);

  const q = filters.query.trim().toLowerCase();
  const visible = trails.filter((t) => {
    if (filters.region !== 'all' && t.region !== filters.region) return false;
    if (filters.difficulty !== 'all' && t.difficulty !== filters.difficulty) return false;
    if (q && !t.name.toLowerCase().includes(q)) return false;
    return true;
  });

  // R5: schedules a second render for every commit.
  useEffect(() => {
    setVisibleCount(visible.length);
  });

  return (
    <section data-testid="trail-explorer">
      <FilterBar
        filters={{ ...filters }}
        regions={[...regions]}
        difficulties={[...difficulties]}
        onFilterChange={(patch) => setFilters(patch)}
      />
      <p className="trail-card__meta" data-testid="result-count">
        {visibleCount} trails
      </p>
      <TrailList
        trails={visible}
        selected={selected}
        onSelect={(slug: string) => setSelected(slug === selected ? null : slug)}
        theme={{ tone: 'cool', dense: true }}
      />
    </section>
  );
}

export function TrailExplorer(props: {
  trails: Trail[];
  regions: string[];
  difficulties: string[];
}) {
  return (
    <FiltersProvider>
      <ExplorerBody {...props} />
    </FiltersProvider>
  );
}
