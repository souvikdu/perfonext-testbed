import { notFound } from 'next/navigation';
import { findTrailBySlug, generateTrailPage } from '@testbed/data';

import { FeatureList, PermitNotice, RegionHeader, TrailFacts } from '@/components/presentational';

export function generateStaticParams() {
  return generateTrailPage(24).map((t) => ({ slug: t.slug }));
}

export default async function TrailDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trail = findTrailBySlug(slug);
  if (!trail) notFound();

  return (
    <>
      <RegionHeader region={trail.region} count={trail.segments.length} />
      <h1>{trail.name}</h1>
      <TrailFacts trail={trail} />
      <FeatureList features={trail.features} />
      <PermitNotice required={trail.permitRequired} />
      <p>{trail.description}</p>

      <h2>Segments</h2>
      <table>
        <thead>
          <tr><th>Segment</th><th>Length</th><th>Gain</th><th>Surface</th><th>Grade</th></tr>
        </thead>
        <tbody>
          {trail.segments.map((seg) => (
            <tr key={seg.id}>
              <td>{seg.id}</td>
              <td>{seg.lengthKm} km</td>
              <td>{seg.gainM} m</td>
              <td>{seg.surface}</td>
              <td>{(seg.grade * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
