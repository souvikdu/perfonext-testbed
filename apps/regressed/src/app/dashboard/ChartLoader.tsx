'use client';

// B1 DEFECT: recharts (~400 KB) is imported statically, so it ships in the initial
// payload of every route that renders this. apps/baseline uses next/dynamic.
import RegionChart from './RegionChart';
import type { RegionDatum } from './RegionChart';

export default function ChartLoader({ data }: { data: RegionDatum[] }) {
  return <RegionChart data={data} />;
}
