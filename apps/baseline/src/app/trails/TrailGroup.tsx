'use client';

import { memo } from 'react';
import type { Trail } from '@testbed/data';

import { TrailCard } from './TrailCard';

function TrailGroupImpl({
  region,
  trails,
  selected,
  onSelect,
}: {
  region: string;
  trails: Trail[];
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <section className="trail-group">
      <h2 className="trail-group__title">
        {region} · {trails.length}
      </h2>
      {trails.map((trail) => (
        <TrailCard
          key={trail.slug}
          trail={trail}
          isSelected={selected === trail.slug}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}

export const TrailGroup = memo(TrailGroupImpl);
