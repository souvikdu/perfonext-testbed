'use client';

import type { Trail } from '@testbed/data';

import { TrailCard } from './TrailCard';

export function TrailGroup({ region, trails, selected, onSelect, theme }: {
  region: string;
  trails: Trail[];
  selected: string | null;
  onSelect: (slug: string) => void;
  theme: { tone: string; dense: boolean };
}) {
  return (
    <section className="trail-group">
      <h2 className="trail-group__title">{region} · {trails.length}</h2>
      {trails.map((trail) => (
        <TrailCard
          key={trail.slug}
          trail={trail}
          isSelected={selected === trail.slug}
          onSelect={(slug: string) => onSelect(slug)}
          theme={{ ...theme }}
        />
      ))}
    </section>
  );
}
