'use client';

import { memo } from 'react';
import { TrailBadge } from '@testbed/ui';

function TrailStatRowImpl({
  distance,
  gain,
  difficulty,
  features,
}: {
  distance: string;
  gain: number;
  difficulty: string;
  features: string[];
}) {
  return (
    <div className="trail-card__meta">
      {distance} · {gain} m · {difficulty}
      <div>
        {features.map((f) => (
          <TrailBadge key={f} tone="cool">
            {f}
          </TrailBadge>
        ))}
      </div>
    </div>
  );
}

export const TrailStatRow = memo(TrailStatRowImpl);
