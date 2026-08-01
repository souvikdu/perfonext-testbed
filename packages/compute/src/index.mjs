import { scoreAll } from './slow/scoring.mjs';
import { findNearbyTrails } from './slow/geo.mjs';
import { aggregateByRegion } from './slow/aggregate.mjs';
import { rollupTree } from './slow/regions.mjs';
import { extractSeasons } from './slow/normalize.mjs';
import { buildTrailReport } from './slow/vendor-hot.mjs';
import * as fast from './fast/index.mjs';

/**
 * Run the full analysis workload.
 * @param {'slow'|'fast'} variant
 */
export function runWorkload(trails, variant = 'slow') {
  if (variant === 'fast') {
    return {
      scores: fast.scoreAll(trails).length,
      nearby: fast.findNearbyTrails(trails).length,
      regions: fast.aggregateByRegion(trails).length,
      rollup: fast.rollupTree(trails).length,
      seasons: fast.extractSeasons(trails).length,
      report: Object.keys(fast.buildTrailReport(trails)).length,
    };
  }

  return {
    scores: scoreAll(trails).length,
    nearby: findNearbyTrails(trails).length,
    regions: aggregateByRegion(trails).length,
    rollup: rollupTree(trails).length,
    seasons: extractSeasons(trails).length,
    report: Object.keys(buildTrailReport(trails)).length,
  };
}

export { scoreAll, findNearbyTrails, aggregateByRegion, rollupTree, extractSeasons, buildTrailReport };
export { fast };
