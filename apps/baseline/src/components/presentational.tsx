// R7 fixture — these four are purely presentational: no hooks, no handlers, no
// browser APIs. In apps/baseline they are Server Components. apps/regressed marks
// each with "use client" for no reason, which is what analyze_client_boundary
// should be able to detect.
import { TrailBadge } from '@testbed/ui';
import type { Trail } from '@testbed/data';

export function FeatureList({ features }: { features: string[] }) {
  return (
    <div className="feature-list">
      {features.map((f) => (
        <TrailBadge key={f} tone="cool">
          {f}
        </TrailBadge>
      ))}
    </div>
  );
}

export function RegionHeader({ region, count }: { region: string; count: number }) {
  return (
    <h2 className="trail-group__title">
      {region} · {count} trails
    </h2>
  );
}

export function TrailFacts({ trail }: { trail: Trail }) {
  return (
    <dl className="trail-card__meta">
      <span>{trail.lengthKm} km</span> · <span>{trail.elevationGainM} m gain</span> ·{' '}
      <span>{trail.difficulty}</span> · <span>{trail.segments.length} segments</span>
    </dl>
  );
}

export function PermitNotice({ required }: { required: boolean }) {
  if (!required) return null;
  return <TrailBadge tone="hot">permit required</TrailBadge>;
}
