'use client';

import { memo, useMemo } from 'react';
import type { Trail } from '@testbed/data';

import { TrailGroup } from './TrailGroup';

function TrailListImpl({
  trails,
  selected,
  onSelect,
}: {
  trails: Trail[];
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Trail[]>();
    for (const trail of trails) {
      let bucket = map.get(trail.region);
      if (!bucket) map.set(trail.region, (bucket = []));
      bucket.push(trail);
    }
    return [...map.entries()];
  }, [trails]);

  return (
    <div data-testid="trail-list">
      {groups.map(([region, list]) => (
        <TrailGroup
          key={region}
          region={region}
          trails={list}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export const TrailList = memo(TrailListImpl);
