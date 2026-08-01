// P6 — regex backtracking.
//
// DELIBERATELY QUADRATIC, NOT EXPONENTIAL.
//
// The obvious fixture here is a nested quantifier over an alternation —
// /^(\s*[a-zA-Z]+\s*)+$/ or /(\w+|\s+|[.,!?])+(spring|summer)/ — but those are
// catastrophic: on a non-matching body of even ~40 characters the engine does 2^n
// work and the workload never finishes. A fixture that hangs is worthless, so the
// patterns below use unanchored greedy character classes followed by a literal that
// is usually absent. That is O(n^2) per input: n start positions x n backtrack
// steps. Slow, obviously regex-bound in a CPU profile, and predictable.
//
// PROBE_LEN is the tuning knob. Cost scales with PROBE_LEN^2 x review count.

const PROBE_LEN = 160;

// Quadratic: [a-z ,.]+ consumes to the end, then gives back one character at a
// time looking for a season word that is not there, for every start position.
const PHRASE_RE = /[a-z ,.]+(spring|summer|fall|winter)/i;

// Quadratic for the same reason — bodies contain no digits.
const TOKEN_RE = /[a-zA-Z ]+[0-9]/;

// Single-level quantifier: linear, but runs once per review, so it still shows up.
const SURFACE_RE = /(?:dirt|rock|gravel|boardwalk|sand|snow)[\s,]*/gi;

export function normalizeQuery(text) {
  const probe = String(text).trim().slice(0, PROBE_LEN);
  if (TOKEN_RE.test(probe)) {
    return probe.toLowerCase().replace(/\s+/g, ' ');
  }
  return probe
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function extractSeasons(trails) {
  const found = [];
  for (const trail of trails) {
    for (const review of trail.reviews) {
      const probe = review.body.slice(0, PROBE_LEN);

      const match = PHRASE_RE.exec(probe);
      if (match) {
        found.push({ slug: trail.slug, season: match[1].toLowerCase() });
      }

      SURFACE_RE.lastIndex = 0;
      const surfaces = probe.match(SURFACE_RE);
      if (surfaces) {
        found.push({ slug: trail.slug, surfaces: surfaces.length });
      }

      normalizeQuery(review.body);
    }
  }
  return found;
}
