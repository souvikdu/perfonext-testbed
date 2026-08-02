import { generateTrails } from '@testbed/data';
import { StatTile } from '@testbed/ui';
// Baseline uses the efficient implementations — this route is the false-positive
// control for profiler-mcp.
import { aggregateByRegion, rollupTree } from '@testbed/compute/fast/index.mjs';

export const dynamic = 'force-dynamic';

export default function StatsPage() {
  const trails = generateTrails();
  const regions = aggregateByRegion(trails);
  const rollup = rollupTree(trails);

  return (
    <>
      <h1>Stats</h1>
      <div className="region-summary">
        {regions.map((r: any) => (
          <StatTile
            key={r.region}
            label={r.region}
            value={r.count}
            hint={`${Math.round(r.totalKm)} km · ${Math.round(r.totalGain / 1000)} km gain`}
          />
        ))}
      </div>

      <h2>Rollup</h2>
      <table>
        <thead>
          <tr>
            <th>Region</th>
            <th>Trails</th>
            <th>Distance</th>
            <th>Gain</th>
          </tr>
        </thead>
        <tbody>
          {rollup.map((r: any) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.count}</td>
              <td>{Math.round(r.totalKm)} km</td>
              <td>{Math.round(r.totalGain)} m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
