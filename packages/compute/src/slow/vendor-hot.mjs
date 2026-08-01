// P5 — npm package CPU attribution. Real work happens INSIDE node_modules so that
// `get_package_costs` has package frames to attribute. This is the case that never
// fired on aqi-monitoring, where the profile was 100% user code.

import cloneDeep from 'lodash/cloneDeep.js';
import sortBy from 'lodash/sortBy.js';
import groupBy from 'lodash/groupBy.js';
import { format, addDays, differenceInCalendarDays } from 'date-fns';

const EPOCH = new Date(2026, 0, 1);

export function buildTrailReport(trails, passes = 2) {
  const rows = [];

  for (let pass = 0; pass < passes; pass += 1) {
    for (const trail of trails) {
      // lodash frames: deep clone of a chunky object graph, every trail, every pass.
      const snapshot = cloneDeep(trail);

      // date-fns frames: formatting is not cheap when called this often.
      const opened = addDays(EPOCH, trail.id % 900);
      const label = format(opened, "yyyy-MM-dd 'season' QQQ");
      const age = differenceInCalendarDays(opened, EPOCH);

      rows.push({
        slug: snapshot.slug,
        region: snapshot.region,
        openedLabel: label,
        ageDays: age,
        segments: snapshot.segments.length,
        reviews: snapshot.reviews.length,
      });
    }
  }

  const grouped = groupBy(rows, 'region');
  const ordered = {};
  for (const region of Object.keys(grouped)) {
    ordered[region] = sortBy(grouped[region], ['ageDays', 'slug']);
  }
  return ordered;
}
