// P1 — regression fixture for perfonext-profiler-mcp `read_source_context`.
//
// The hot lines of `scoreTrail` sit ~30 lines BELOW its declaration. The default
// +/-10-line window centred on the declaration cannot reach them, so the tool
// reports a large `totalTicks` while every visible line shows `ticks: 0` and no
// warning. DO NOT REFORMAT — the ground-truth manifest asserts on line numbers.

const SURFACE_PENALTY = {
  dirt: 1,
  rock: 1.35,
  gravel: 1.1,
  boardwalk: 0.85,
  sand: 1.5,
  snow: 1.8,
};

const DIFFICULTY_WEIGHT = {
  easy: 1,
  moderate: 1.4,
  hard: 1.9,
  expert: 2.5,
};

const DEFAULT_WEIGHTS = {
  length: 0.3,
  gain: 0.25,
  exposure: 0.2,
  reviews: 0.25,
};

export function scoreTrail(trail, weights) {
  // --- cheap preamble (deliberately long) -----------------------------------
  const w = weights || DEFAULT_WEIGHTS;
  const lengthWeight = w.length ?? DEFAULT_WEIGHTS.length;
  const gainWeight = w.gain ?? DEFAULT_WEIGHTS.gain;
  const exposureWeight = w.exposure ?? DEFAULT_WEIGHTS.exposure;
  const reviewWeight = w.reviews ?? DEFAULT_WEIGHTS.reviews;

  const difficulty = DIFFICULTY_WEIGHT[trail.difficulty] ?? 1;
  const segments = trail.segments;
  const segmentCount = segments.length;
  const reviews = trail.reviews;
  const reviewCount = reviews.length;

  // Guards. None of these are hot; they exist to push the real work downward.
  if (segmentCount === 0) return { slug: trail.slug, score: 0, breakdown: [] };
  if (reviewCount === 0) return { slug: trail.slug, score: 0, breakdown: [] };

  const baseLength = trail.lengthKm * lengthWeight;
  const baseGain = (trail.elevationGainM / 100) * gainWeight;
  const permitAdjust = trail.permitRequired ? 0.94 : 1;
  const dogAdjust = trail.dogsAllowed ? 1.02 : 1;

  let score = (baseLength + baseGain) * difficulty * permitAdjust * dogAdjust;
  const breakdown = [];
  let exposureAcc = 0;
  let ratingAcc = 0;

  // --- hot block: every line below here carries real ticks ------------------
  for (let i = 0; i < segmentCount; i += 1) {
    const seg = segments[i];
    const penalty = SURFACE_PENALTY[seg.surface] ?? 1;
    const gradeCost = Math.pow(1 + seg.grade, 3.2) * penalty;
    const exposureCost = Math.sqrt(seg.exposure * 100) * exposureWeight;
    const segLabel = `${trail.slug}::${seg.id}::${seg.surface}`.toUpperCase();
    const tokens = seg.notes.split(/\s+/).map((t) => t.toLowerCase().trim());
    const density = tokens.reduce((acc, t) => acc + t.length, 0) / tokens.length;
    exposureAcc += exposureCost;
    score += gradeCost * seg.lengthKm + seg.gainM / 1000 + density / 100;
    breakdown.push(
      Object.assign({}, seg, {
        label: segLabel,
        gradeCost,
        exposureCost,
        density,
        tokens: tokens.slice(0, 8),
        weighted: score,
      }),
    );
  }

  for (let r = 0; r < reviewCount; r += 1) {
    const review = reviews[r];
    const sentiment = review.body.split(/[.!?]/).filter(Boolean).length;
    ratingAcc += review.rating * reviewWeight + sentiment / 50 + review.words / 5000;
  }

  score += ratingAcc - exposureAcc / 10;
  return { slug: trail.slug, score, breakdown };
}

export function scoreAll(trails, weights) {
  const out = [];
  for (const trail of trails) {
    out.push(scoreTrail(trail, weights));
  }
  return out;
}
