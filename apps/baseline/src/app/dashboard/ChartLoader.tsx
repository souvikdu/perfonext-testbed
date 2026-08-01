'use client';

import dynamic from 'next/dynamic';

import type { RegionDatum } from './RegionChart';

// B1 fixture (correct side): recharts is ~400 KB and is only needed once the chart
// is visible, so it is code-split out of the route's initial payload.
const RegionChart = dynamic(() => import('./RegionChart'), {
  ssr: false,
  loading: () => <div className="trail-card__meta">Loading chart…</div>,
});

export default function ChartLoader({ data }: { data: RegionDatum[] }) {
  return <RegionChart data={data} />;
}
