import { BarChart2, Flag, Navigation, Feather } from 'react-feather';
import { generateTrails } from '@testbed/data';
import { StatTile } from '@testbed/ui';
import { aggregateByRegion } from '@testbed/compute';

import ChartLoader from './ChartLoader';
import GlobalTicker from '../GlobalTicker';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const trails = generateTrails();
  const data = aggregateByRegion(trails).map((r: any) => ({
    region: r.region,
    count: r.trails.length,
    totalKm: Math.round(r.totalKm),
  }));

  return (
    <>
      <GlobalTicker />
      <h1><BarChart2 size={22} /> Dashboard</h1>
      <div className="region-summary">
        <StatTile label="Trails" value={trails.length} />
        <StatTile label="Regions" value={data.length} />
        <StatTile label="Segments" value={trails.reduce((s, t) => s + t.segments.length, 0)} />
      </div>
      <ChartLoader data={data} />
      <p className="trail-card__meta">
        <Flag size={16} /> summits · <Navigation size={16} /> loops ·{' '}
        <Feather size={16} /> forest
      </p>
    </>
  );
}
