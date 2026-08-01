// Deterministic dataset: same seed always yields byte-identical trails, so builds
// and CPU profiles are reproducible across runs.

/** mulberry32 — small, fast, deterministic PRNG. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const REGIONS = [
  'Cascade Range',
  'Sierra Nevada',
  'Rocky Mountains',
  'Appalachian Ridge',
  'Sonoran Basin',
  'Great Lakes Shore',
  'Ozark Highlands',
  'Olympic Coast',
];

export const DIFFICULTIES = ['easy', 'moderate', 'hard', 'expert'];

export const FEATURES = [
  'waterfall',
  'summit',
  'lake',
  'old-growth',
  'wildflowers',
  'canyon',
  'hot-spring',
  'arch',
  'glacier',
  'slot',
];

const SURFACES = ['dirt', 'rock', 'gravel', 'boardwalk', 'sand', 'snow'];

const NAME_HEADS = [
  'Granite', 'Cedar', 'Silver', 'Copper', 'Hollow', 'Raven', 'Thunder',
  'Aspen', 'Basalt', 'Juniper', 'Marble', 'Quiet', 'Bitter', 'Elk',
];
const NAME_TAILS = [
  'Ridge', 'Loop', 'Falls', 'Pass', 'Spur', 'Basin', 'Traverse',
  'Notch', 'Bench', 'Gulch', 'Crossing', 'Rim',
];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Build one trail. `segments` is deliberately chunky — the scoring workload in
 * @testbed/compute iterates it, which is where the CPU profile hotspots come from.
 */
function makeTrail(rng, index) {
  const head = pick(rng, NAME_HEADS);
  const tail = pick(rng, NAME_TAILS);
  const name = `${head} ${tail}`;
  const slug = `${head.toLowerCase()}-${tail.toLowerCase()}-${index}`;

  const segmentCount = 4 + Math.floor(rng() * 8);
  const segments = [];
  for (let s = 0; s < segmentCount; s += 1) {
    segments.push({
      id: `${slug}-s${s}`,
      lengthKm: Number((0.4 + rng() * 3.2).toFixed(3)),
      gainM: Math.floor(rng() * 240),
      surface: pick(rng, SURFACES),
      grade: Number((rng() * 0.22).toFixed(4)),
      exposure: Number(rng().toFixed(4)),
      notes: `${head} section ${s} — ${pick(rng, SURFACES)} tread, ${Math.floor(rng() * 40)} switchbacks`,
    });
  }

  const featureCount = 1 + Math.floor(rng() * 4);
  const features = [];
  for (let f = 0; f < featureCount; f += 1) {
    const feature = pick(rng, FEATURES);
    if (!features.includes(feature)) features.push(feature);
  }

  const reviewCount = 3 + Math.floor(rng() * 12);
  const reviews = [];
  for (let r = 0; r < reviewCount; r += 1) {
    reviews.push({
      rating: 1 + Math.floor(rng() * 5),
      words: 20 + Math.floor(rng() * 180),
      body: `Hiked ${name} in ${pick(rng, ['spring', 'summer', 'fall', 'winter'])}. `
        + `Tread was ${pick(rng, SURFACES)}. Would ${rng() > 0.3 ? '' : 'not '}return.`,
    });
  }

  return {
    id: index,
    slug,
    name,
    region: pick(rng, REGIONS),
    difficulty: pick(rng, DIFFICULTIES),
    lengthKm: Number(segments.reduce((sum, s) => sum + s.lengthKm, 0).toFixed(2)),
    elevationGainM: segments.reduce((sum, s) => sum + s.gainM, 0),
    lat: Number((24 + rng() * 25).toFixed(5)),
    lon: Number((-124 + rng() * 58).toFixed(5)),
    permitRequired: rng() > 0.78,
    dogsAllowed: rng() > 0.45,
    features,
    segments,
    reviews,
    description: `${name} climbs through the ${pick(rng, REGIONS)} with `
      + `${featureCount} notable features and ${segmentCount} mapped segments.`,
  };
}

const cache = new Map();

/** Generate `count` trails. Memoised per (count, seed) so repeated calls are free. */
export function generateTrails(count = 3000, seed = 20260731) {
  const key = `${count}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rng = makeRng(seed);
  const trails = [];
  for (let i = 0; i < count; i += 1) {
    trails.push(makeTrail(rng, i));
  }
  cache.set(key, trails);
  return trails;
}

/** Small slice for client-side rendering work. */
export function generateTrailPage(count = 120, seed = 20260731) {
  return generateTrails(3000, seed).slice(0, count);
}

export function findTrailBySlug(slug, count = 3000, seed = 20260731) {
  return generateTrails(count, seed).find((t) => t.slug === slug) ?? null;
}
