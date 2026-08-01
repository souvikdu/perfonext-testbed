// Pages Router route. Kept alongside the App Router so build-mcp parses BOTH
// build-manifest.json and app-build-manifest.json in the same build.
//
// B3 DEFECT: RegionSummary comes from @testbed/ui, which resolves lodash@4.17.21
// from the hoisted root. The App Router side (GlobalTicker) resolves lodash@3.10.1
// from apps/regressed/node_modules. Two majors, two separate chunk graphs.
import type { GetStaticProps } from 'next';
import { generateTrailPage } from '@testbed/data';
import type { Trail } from '@testbed/data';
import { RegionSummary } from '@testbed/ui';

type Props = { trails: Trail[] };

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { trails: generateTrailPage(60) },
});

export default function LegacyAdmin({ trails }: Props) {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Legacy admin</h1>
      <RegionSummary trails={trails} />
      <table>
        <thead>
          <tr><th>Slug</th><th>Name</th><th>Region</th><th>Difficulty</th><th>Length</th></tr>
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
