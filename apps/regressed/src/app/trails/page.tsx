import { DIFFICULTIES, REGIONS, generateTrailPage } from '@testbed/data';

import { TrailExplorer } from './TrailExplorer';
import GlobalTicker from '../GlobalTicker';

export default function TrailsPage() {
  const trails = generateTrailPage(120);
  return (
    <>
      <GlobalTicker />
      <h1>Trails</h1>
      <TrailExplorer trails={trails} regions={REGIONS} difficulties={DIFFICULTIES} />
    </>
  );
}
