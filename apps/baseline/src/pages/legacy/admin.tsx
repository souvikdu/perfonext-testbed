// Pages Router route. Kept alongside the App Router so build-mcp parses BOTH
// build-manifest.json and app-build-manifest.json in the same build.
import type { GetStaticProps } from 'next';
import { generateTrailPage } from '@testbed/data';
import type { Trail } from '@testbed/data';

type Props = { trails: Pick<Trail, 'slug' | 'name' | 'region' | 'difficulty' | 'lengthKm'>[] };

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: {
    trails: generateTrailPage(60).map((t) => ({
      slug: t.slug,
      name: t.name,
      region: t.region,
      difficulty: t.difficulty,
      lengthKm: t.lengthKm,
    })),
  },
});

export default function LegacyAdmin({ trails }: Props) {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Legacy admin</h1>
      <table>
        <thead>
          <tr>
            <th>Slug</th>
            <th>Name</th>
            <th>Region</th>
            <th>Difficulty</th>
            <th>Length</th>
          </tr>
        </thead>
        <tbody>
          {trails.map((t) => (
            <tr key={t.slug}>
              <td>{t.slug}</td>
              <td>{t.name}</td>
              <td>{t.region}</td>
              <td>{t.difficulty}</td>
              <td>{t.lengthKm} km</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
