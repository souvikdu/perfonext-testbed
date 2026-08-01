'use client';

// R7 DEFECT: none of these four use state, effects, handlers or browser APIs, yet
// the file carries "use client" — so all four are pushed across the client boundary
// and shipped as JS. In apps/baseline they are Server Components.
// This is the fixture for the render-mcp roadmap tool analyze_client_boundary.
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
