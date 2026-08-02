'use client';

import { memo } from 'react';
import type { Trail } from '@testbed/data';
import { formatDistance } from '@testbed/ui';

import { TrailStatRow } from './TrailStatRow';

function TrailCardImpl({
  trail,
  isSelected,
  onSelect,
}: {
  trail: Trail;
  isSelected: boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <article
      className="trail-card"
      data-testid="trail-card"
      data-slug={trail.slug}
      onClick={() => onSelect(trail.slug)}
    >
      <h3>
        {trail.name}
        {isSelected ? ' ★' : ''}
      </h3>
      <TrailStatRow
        distance={formatDistance(trail.lengthKm)}
        gain={trail.elevationGainM}
        difficulty={trail.difficulty}
        features={trail.features}
      />
    </article>
  );
}

export const TrailCard = memo(TrailCardImpl);
