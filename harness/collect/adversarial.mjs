#!/usr/bin/env node
// Generates malformed / degenerate inputs (X1-X5).
//
// These exist because every real fixture in this testbed is well-formed, and the three
// MCP servers are most likely to fail badly on input they did not expect. Each fixture
// is derived from a real collected artifact rather than hand-written, so the only thing
// that differs from a valid input is the specific damage being tested.

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ARTIFACTS = join(ROOT, 'artifacts');
const OUT = join(ROOT, 'fixtures', 'adversarial');

async function readProfileSummary() {
  const raw = await readFile(join(ARTIFACTS, 'profile', 'summary.json'), 'utf8');
  const summary = JSON.parse(raw);
  const slow = summary.results.find(r => r.variant === 'slow');
  return join(ARTIFACTS, 'profile', 'slow', slow.mainThreadFile);
}

// X1 — a profile cut off mid-write, which is what a killed process actually leaves behind.
async function truncatedProfile(sourcePath) {
  const raw = await readFile(sourcePath, 'utf8');
  const dir = join(OUT, 'x1-truncated-profile');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'truncated.cpuprofile'), raw.slice(0, Math.floor(raw.length * 0.6)));
  return { id: 'X1', path: join(dir, 'truncated.cpuprofile') };
}

// X2 — structurally valid but with nothing in it. Every percentage denominator is zero.
async function emptyProfile(sourcePath) {
  const parsed = JSON.parse(await readFile(sourcePath, 'utf8'));
  const dir = join(OUT, 'x2-zero-sample-profile');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'zero-sample.cpuprofile'),
    JSON.stringify({
      nodes: parsed.nodes.slice(0, 1),
      startTime: parsed.startTime,
      endTime: parsed.startTime,
      samples: [],
      timeDeltas: [],
    }),
  );
  return { id: 'X2', path: join(dir, 'zero-sample.cpuprofile') };
}

// X3 — the silent-failure case the build server's own recipe warns about: stats written
// without `ids` and with the default module space, so chunks lose their ids and the
// module list collapses into a single "N modules" group. Reproduced by degrading a real
// stats.json rather than rebuilding, since only the shape matters here.
async function collapsedStats() {
  const dir = join(OUT, 'x3-collapsed-stats', '.next');
  await mkdir(dir, { recursive: true });

  const realBuild = join(ARTIFACTS, 'build', 'regressed', '.next');
  for (const file of ['build-manifest.json', 'app-build-manifest.json', 'prerender-manifest.json']) {
    await cp(join(realBuild, file), join(dir, file));
  }

  const stats = JSON.parse(await readFile(join(realBuild, 'stats.json'), 'utf8'));
  await writeFile(
    join(dir, 'stats.json'),
    JSON.stringify({
      ...stats,
      chunks: (stats.chunks ?? []).map(({ id, ...rest }) => rest),
      modules: [{ name: '953 modules', size: 4_000_000, modules: undefined, reasons: [] }],
    }),
  );
  return { id: 'X3', buildDir: dir };
}

// X4 — a manifest whose shape belongs to a different Next.js major.
async function versionSkewedManifest() {
  const dir = join(OUT, 'x4-version-skew', '.next');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'build-manifest.json'),
    JSON.stringify({
      __rewrites: { beforeFiles: [], afterFiles: [], fallback: [] },
      pages: { '/': ['static/chunks/main-legacy.js'] },
      devFiles: [],
      ampDevFiles: [],
      polyfillFiles: [],
      lowPriorityFiles: [],
      rootMainFiles: [],
      ampFirstPages: [],
    }),
  );
  return { id: 'X4', buildDir: dir };
}

// X5 — a directory that exists but holds nothing.
async function emptyBuildDir() {
  const dir = join(OUT, 'x5-empty', '.next');
  await mkdir(dir, { recursive: true });
  return { id: 'X5', buildDir: dir };
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const profilePath = await readProfileSummary();
  const fixtures = [
    await truncatedProfile(profilePath),
    await emptyProfile(profilePath),
    await collapsedStats(),
    await versionSkewedManifest(),
    await emptyBuildDir(),
  ];

  await writeFile(
    join(OUT, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), fixtures }, null, 2)}\n`,
  );

  for (const fixture of fixtures) {
    console.log(`${fixture.id}: ${fixture.path ?? fixture.buildDir}`);
  }
  console.log(`\nadversarial fixtures ready under ${OUT}`);
}

main().catch(error => {
  console.error(`adversarial generation failed: ${error.message}`);
  process.exitCode = 1;
});
