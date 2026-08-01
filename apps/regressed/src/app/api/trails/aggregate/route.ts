import { NextResponse } from 'next/server';
import { generateTrails } from '@testbed/data';
import {
  aggregateByRegion,
  buildTrailReport,
  findNearbyTrails,
  rollupTree,
} from '@testbed/compute';

export const dynamic = 'force-dynamic';

export async function GET() {
  const trails = generateTrails();

  const regions = aggregateByRegion(trails);
  const rollup = rollupTree(trails);
  const nearby = findNearbyTrails(trails);
  const report = buildTrailReport(trails);

  return NextResponse.json({
    regions: regions.length,
    rollup: rollup.length,
    nearby: nearby.length,
    reportRegions: Object.keys(report).length,
  });
}
