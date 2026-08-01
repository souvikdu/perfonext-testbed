'use client';

import groupBy from 'lodash/groupBy';
import type { Trail } from '@testbed/data';

import { formatDistance, formatGain } from './format';
import { StatTile } from './StatTile';

export function RegionSummary({ trails }: { trails: Trail[] }) {
  const byRegion = groupBy(trails, 'region');

  return (
    <div className="region-summary">
      {Object.entries(byRegion).map(([region, list]) => {
        const totalKm = list.reduce((sum, t) => sum + t.lengthKm, 0);
        const totalGain = list.reduce((sum, t) => sum + t.elevationGainM, 0);
        return (
          <StatTile
            key={region}
            label={region}
            value={list.length}
            hint={`${formatDistance(totalKm)} · ${formatGain(totalGain)}`}
          />
        );
      })}
    </div>
  );
}
