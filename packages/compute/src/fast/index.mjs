// Baseline (correct) implementations. Same outputs as ./slow, without the planted
// pathologies. These exist as a FALSE-POSITIVE CONTROL: profiling this variant
// should yield few or no high-severity findings.

const SURFACE_PENALTY = { dirt: 1, rock: 1.35, gravel: 1.1, boardwalk: 0.85, sand: 1.5, snow: 1.8 };
const DIFFICULTY_WEIGHT = { easy: 1, moderate: 1.4, hard: 1.9, expert: 2.5 };
const DEFAULT_WEIGHTS = { length: 0.3, gain: 0.25, exposure: 0.2, reviews: 0.25 };

export function scoreTrail(trail, weights) {
  const w = weights || DEFAULT_WEIGHTS;
  const difficulty = DIFFICULTY_WEIGHT[trail.difficulty] ?? 1;
  const permitAdjust = trail.permitRequired ? 0.94 : 1;
  const dogAdjust = trail.dogsAllowed ? 1.02 : 1;

  let score =
    (trail.lengthKm * w.length + (trail.elevationGainM / 100) * w.gain) *
    difficulty *
    permitAdjust *
    dogAdjust;

  let exposureAcc = 0;
  for (let i = 0; i < trail.segments.length; i += 1) {
    const seg = trail.segments[i];
    const penalty = SURFACE_PENALTY[seg.surface] ?? 1;
    exposureAcc += seg.exposure * 10 * w.exposure;
    score += (1 + seg.grade) * penalty * seg.lengthKm + seg.gainM / 1000;
  }

  let ratingAcc = 0;
  for (let r = 0; r < trail.reviews.length; r += 1) {
    ratingAcc += trail.reviews[r].rating * w.reviews;
  }

  return { slug: trail.slug, score: score + ratingAcc - exposureAcc / 10 };
}

export function scoreAll(trails, weights) {
  return trails.map((t) => scoreTrail(t, weights));
}

export function findNearbyTrails(trails, radiusKm = 120) {
  // Grid bucketing: only compare against the 9 surrounding cells.
  const cell = radiusKm / 111;
  const grid = new Map();
  const key = (lat, lon) => `${Math.floor(lat / cell)}:${Math.floor(lon / cell)}`;

  for (const t of trails) {
    const k = key(t.lat, t.lon);
    let bucket = grid.get(k);
    if (!bucket) grid.set(k, (bucket = []));
    bucket.push(t);
  }

  const result = [];
  for (const a of trails) {
    const gx = Math.floor(a.lat / cell);
    const gy = Math.floor(a.lon / cell);
    const neighbours = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const bucket = grid.get(`${gx + dx}:${gy + dy}`);
        if (!bucket) continue;
        for (const b of bucket) {
          if (b.slug === a.slug) continue;
          const dLat = (b.lat - a.lat) * 111;
          const dLon = (b.lon - a.lon) * 89;
          const distance = Math.sqrt(dLat * dLat + dLon * dLon);
          if (distance <= radiusKm) neighbours.push({ slug: b.slug, distance });
        }
      }
    }
    neighbours.sort((x, y) => x.distance - y.distance);
    result.push({ slug: a.slug, neighbours: neighbours.slice(0, 5) });
  }
  return result;
}

export function aggregateByRegion(trails) {
  const table = new Map();
  for (const trail of trails) {
    let bucket = table.get(trail.region);
    if (!bucket) {
      bucket = { region: trail.region, count: 0, totalKm: 0, totalGain: 0, words: 0 };
      table.set(trail.region, bucket);
    }
    bucket.count += 1;
    bucket.totalKm += trail.lengthKm;
    bucket.totalGain += trail.elevationGainM;
    for (let i = 0; i < trail.reviews.length; i += 1) bucket.words += trail.reviews[i].words;
  }
  return [...table.values()];
}

export function rollupTree(trails) {
  const table = new Map();
  for (const trail of trails) {
    let node = table.get(trail.region);
    if (!node)
      table.set(trail.region, (node = { name: trail.region, totalKm: 0, totalGain: 0, count: 0 }));
    node.totalKm += trail.lengthKm;
    node.totalGain += trail.elevationGainM;
    node.count += 1;
  }
  return [...table.values()];
}

const SEASON_RE = /\b(spring|summer|fall|winter)\b/i;

export function normalizeQuery(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/ {2,}/g, ' ');
}

export function extractSeasons(trails) {
  const found = [];
  for (const trail of trails) {
    for (let i = 0; i < trail.reviews.length; i += 1) {
      const match = SEASON_RE.exec(trail.reviews[i].body);
      if (match) found.push({ slug: trail.slug, season: match[1].toLowerCase() });
    }
  }
  return found;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EPOCH_MS = new Date(2026, 0, 1).getTime();

export function buildTrailReport(trails) {
  const ordered = {};
  for (const trail of trails) {
    const ageDays = trail.id % 900;
    const d = new Date(EPOCH_MS + ageDays * 86400000);
    const row = {
      slug: trail.slug,
      region: trail.region,
      openedLabel: `${d.getFullYear()}-${MONTHS[d.getMonth()]}-${d.getDate()}`,
      ageDays,
      segments: trail.segments.length,
      reviews: trail.reviews.length,
    };
    (ordered[trail.region] ||= []).push(row);
  }
  for (const region of Object.keys(ordered)) {
    ordered[region].sort((a, b) => a.ageDays - b.ageDays || (a.slug < b.slug ? -1 : 1));
  }
  return ordered;
}
