import { generateTrails } from '@testbed/data';
import { StatTile } from '@testbed/ui';

import { FeatureList, PermitNotice, TrailFacts } from '@/components/presentational';
import GlobalTicker from './GlobalTicker';

export default function HomePage() {
  const trails = generateTrails();
  const featured = trails.slice(0, 6);
  const totalKm = trails.reduce((sum, t) => sum + t.lengthKm, 0);

  return (
    <>
      <GlobalTicker />
      <h1>Trailhead</h1>
      <p className="trail-card__meta">
        Baseline variant — every route here is implemented the way it should be.
      </p>

      <div className="region-summary">
        <StatTile label="Trails" value={trails.length} />
        <StatTile label="Total distance" value={`${Math.round(totalKm)} km`} />
        <StatTile label="Regions" value={new Set(trails.map((t) => t.region)).size} />
      </div>

      <h2>Featured</h2>
      {featured.map((trail) => (
        <article key={trail.slug} className="trail-card">
          <h3>{trail.name}</h3>
          <TrailFacts trail={trail} />
          <FeatureList features={trail.features} />
          <PermitNotice required={trail.permitRequired} />
        </article>
      ))}
    </>
  );
}
