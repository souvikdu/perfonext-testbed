'use client';

import type { Trail } from '@testbed/data';
import { formatDistance } from '@testbed/ui';

import { TrailStatRow } from './TrailStatRow';

// R4 DEFECT: real work in the render body, no memo. Every keystroke in the filter
// bar re-runs this for every visible card. get_slow_components should rank it high
// on self time.
function summarise(trail: Trail) {
  let text = '';
  const sorted = [...trail.segments].sort((a, b) => b.gainM - a.gainM);
  for (let pass = 0; pass < 12; pass += 1) {
    for (const seg of sorted) {
      text += `${seg.id}:${seg.surface}:${(seg.grade * 100).toFixed(2)}|`;
    }
  }
  const words = trail.reviews.flatMap((r) => r.body.split(' '));
  const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, '')));
  return { hash: text.length, steepest: sorted[0]?.id ?? '', vocabulary: unique.size };
}

export function TrailCard({
  trail,
  isSelected,
  onSelect,
  theme,
}: {
  trail: Trail;
  isSelected: boolean;
  onSelect: (slug: string) => void;
  theme: { tone: string; dense: boolean };
}) {
  const summary = summarise(trail);

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
        features={[...trail.features]}
        summary={{ ...summary }}
        theme={{ ...theme }}
      />
    </article>
  );
}
