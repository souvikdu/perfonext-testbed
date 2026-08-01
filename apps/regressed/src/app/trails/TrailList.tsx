'use client';

import type { Trail } from '@testbed/data';

import { TrailGroup } from './TrailGroup';

// Regrouped from scratch on every render (no useMemo), and every TrailGroup gets a
// brand-new array plus a brand-new arrow prop.
export function TrailList({ trails, selected, onSelect, theme }: {
  trails: Trail[];
  selected: string | null;
  onSelect: (slug: string) => void;
  theme: { tone: string; dense: boolean };
}) {
  const map = new Map<string, Trail[]>();
  for (const trail of trails) {
    let bucket = map.get(trail.region);
    if (!bucket) map.set(trail.region, (bucket = []));
    bucket.push(trail);
  }
  const groups = [...map.entries()];

  return (
    <div data-testid="trail-list">
      {groups.map(([region, list]) => (
        <TrailGroup
          key={region}
          region={region}
          trails={list.slice()}
          selected={selected}
          onSelect={(slug: string) => onSelect(slug)}
          theme={{ ...theme }}
        />
      ))}
    </div>
  );
}
