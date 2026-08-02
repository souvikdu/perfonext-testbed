import { generateTrails } from '@testbed/data';
import { aggregateByRegion } from '@testbed/compute';

import ChartLoader from '../dashboard/ChartLoader';
import ReportExporter from './ReportExporter';
import GlobalTicker from '../GlobalTicker';

export const dynamic = 'force-dynamic';

export default function ReportPage() {
  const trails = generateTrails();
  const rows = aggregateByRegion(trails).map((r: any) => ({
    region: r.region,
    count: r.trails.length,
    totalKm: Math.round(r.totalKm),
  }));

  return (
    <>
      <GlobalTicker />
      <h1>Region report</h1>
      <ReportExporter rows={rows} />
      <ChartLoader data={rows} />
      <table>
        <thead>
          <tr>
            <th>Region</th>
            <th>Trails</th>
            <th>Distance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.region}>
              <td>{row.region}</td>
              <td>{row.count}</td>
              <td>{row.totalKm} km</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
