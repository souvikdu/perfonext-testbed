// P3 — GC pressure. Every iteration allocates several throwaway intermediate arrays
// and objects. `suggest_optimizations` should surface a gc-pressure pattern and
// attribute the allocation source to this file.
// P7 — JSON.parse(JSON.stringify(...)) deep clone sits in the same hot path.

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function aggregateByRegion(trails, passes = 3) {
  let table = {};

  for (let pass = 0; pass < passes; pass += 1) {
    table = {};
    for (const trail of trails) {
      // Four chained allocations per trail, per pass — all immediately discarded.
      const segmentLengths = trail.segments.map((s) => s.lengthKm);
      const hardSegments = trail.segments
        .map((s) => ({ ...s, weighted: s.gainM * (1 + s.grade) }))
        .filter((s) => s.weighted > 40)
        .map((s) => s.weighted);
      const reviewWords = trail.reviews.map((r) => r.body.split(' '));
      const flatWords = [].concat(...reviewWords);

      const snapshot = deepClone({
        slug: trail.slug,
        features: trail.features,
        segments: trail.segments,
      });

      const bucket = table[trail.region] || {
        region: trail.region,
        trails: [],
        totalKm: 0,
        totalGain: 0,
        words: 0,
      };

      bucket.trails = bucket.trails.concat([snapshot.slug]);
      bucket.totalKm += segmentLengths.reduce((a, b) => a + b, 0);
      bucket.totalGain += hardSegments.reduce((a, b) => a + b, 0);
      bucket.words += flatWords.length;
      table[trail.region] = bucket;
    }
  }

  return Object.values(table);
}
