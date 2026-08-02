'use client';

import { TrailBadge } from '@testbed/ui';

export function TrailStatRow({
  distance,
  gain,
  difficulty,
  features,
  summary,
  theme,
}: {
  distance: string;
  gain: number;
  difficulty: string;
  features: string[];
  summary: { hash: number; steepest: string; vocabulary: number };
  theme: { tone: string; dense: boolean };
}) {
  return (
    <div className="trail-card__meta">
      {distance} · {gain} m · {difficulty} · {summary.vocabulary} words
      <div>
        {features.map((f) => (
          <TrailBadge key={f} tone={theme.tone}>
            {f}
          </TrailBadge>
        ))}
      </div>
    </div>
  );
}
