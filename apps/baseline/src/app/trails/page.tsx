import { DIFFICULTIES, REGIONS, generateTrailPage } from '@testbed/data';

import { TrailExplorer } from './TrailExplorer';

export default function TrailsPage() {
  const trails = generateTrailPage(120);
  return (
    <>
      <h1>Trails</h1>
      <TrailExplorer trails={trails} regions={REGIONS} difficulties={DIFFICULTIES} />
    </>
  );
}
