'use client';

import type { Filters } from './FiltersContext';

// No memo — and the props it receives are new objects on every parent render, so
// memo would not have helped anyway. That pairing is the point of the fixture.
export function FilterBar({
  filters,
  regions,
  difficulties,
  onFilterChange,
}: {
  filters: Filters;
  regions: string[];
  difficulties: string[];
  onFilterChange: (patch: Partial<Filters>) => void;
}) {
  return (
    <div className="filter-bar">
      <input
        data-testid="query-input"
        placeholder="Search trails…"
        value={filters.query}
        onChange={(e) => onFilterChange({ query: e.target.value })}
      />
      <select
        data-testid="region-select"
        value={filters.region}
        onChange={(e) => onFilterChange({ region: e.target.value })}
      >
        <option value="all">All regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        data-testid="difficulty-select"
        value={filters.difficulty}
        onChange={(e) => onFilterChange({ difficulty: e.target.value })}
      >
        <option value="all">All difficulties</option>
        {difficulties.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
