#!/usr/bin/env node
// Profiler lane collection.
//
// Produces the artifacts perfonext-profiler-mcp consumes:
//   artifacts/profile/slow/*.cpuprofile   (regressed workload, several files — one per thread)
//   artifacts/profile/fast/*.cpuprofile   (baseline workload — the false-positive control)
//
// Both directories are populated by the same command with only --variant changed, so
// any difference in the tool's output is attributable to the code under test and
// nothing else.
//
// Guards:
//   1. at least one .cpuprofile per variant
//   2. every profile parses and has nodes[] and samples[]
//   3. the slow variant must contain a frame for scoreTrail with positionTicks —
//      that frame is the whole point of the P1 read_source_context fixture, and a
//      profile without it would make the harness assert on nothing

import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ARTIFACTS = join(ROOT, 'artifacts', 'profile');
const BENCH = join(HERE, 'bench.mjs');

const VARIANTS = ['slow', 'fast'];

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      env: { ...process.env, ...options.env },
      stdio: 'inherit',
    });
    child.on('error', rejectPromise);
    child.on('close', (code) =>
      code === 0
        ? resolvePromise()
        : rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code}`)),
    );
  });
}

function collectFrames(profile) {
  const frames = new Map();
  for (const node of profile.nodes ?? []) {
    const name = node.callFrame?.functionName;
    if (!name) {
      continue;
    }
    const tickCount = (node.positionTicks ?? []).reduce((sum, tick) => sum + (tick.ticks ?? 0), 0);
    const existing = frames.get(name) ?? { hitCount: 0, positionTicks: 0, url: node.callFrame.url };
    existing.hitCount += node.hitCount ?? 0;
    existing.positionTicks += tickCount;
    frames.set(name, existing);
  }
  return frames;
}

async function verifyVariant(outDir, variant) {
  const entries = (await readdir(outDir)).filter((name) => name.endsWith('.cpuprofile'));

  if (entries.length === 0) {
    throw new Error(
      `[${variant}] no .cpuprofile files were written to ${outDir}. ` +
        'Node only emits them on clean exit — check the bench process did not crash.',
    );
  }

  let mainThread = null;
  const files = [];

  for (const name of entries) {
    const raw = await readFile(join(outDir, name), 'utf8');
    const profile = JSON.parse(raw);

    if (!Array.isArray(profile.nodes) || profile.nodes.length === 0) {
      throw new Error(`[${variant}] ${name} has no nodes[]`);
    }
    if (!Array.isArray(profile.samples) || profile.samples.length === 0) {
      throw new Error(`[${variant}] ${name} has no samples[]`);
    }

    const frames = collectFrames(profile);
    const record = { file: name, sampleCount: profile.samples.length, frames };
    files.push(record);

    if (!mainThread || record.sampleCount > mainThread.sampleCount) {
      mainThread = record;
    }
  }

  if (variant === 'slow') {
    const scoreTrail = mainThread.frames.get('scoreTrail');
    if (!scoreTrail) {
      throw new Error(
        '[slow] no scoreTrail frame in the main-thread profile. The P1 read_source_context ' +
          'fixture depends on it. Did serverExternalPackages / the plain-ESM compute package regress?',
      );
    }
    if (scoreTrail.positionTicks === 0) {
      throw new Error(
        '[slow] scoreTrail has no positionTicks. read_source_context has nothing to annotate. ' +
          'Increase --trails or the pass count in bench.mjs.',
      );
    }
    if (!scoreTrail.url.includes('packages/compute/src/slow/scoring.mjs')) {
      throw new Error(
        `[slow] scoreTrail resolved to ${scoreTrail.url}, expected the unbundled source file. ` +
          'Line-number assertions would be meaningless.',
      );
    }
  }

  return {
    variant,
    fileCount: files.length,
    mainThreadFile: mainThread.file,
    mainThreadSamples: mainThread.sampleCount,
    files: files.map((f) => ({ file: f.file, sampleCount: f.sampleCount })),
  };
}

async function collectVariant(variant) {
  const outDir = join(ARTIFACTS, variant);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  console.log(`\n=== profiling ${variant} workload`);
  await run(
    process.execPath,
    [
      '--cpu-prof',
      '--cpu-prof-dir',
      outDir,
      // Default is 1000us. The workload runs for a few seconds, which at the default
      // leaves individual source lines with single-digit positionTicks — too coarse
      // for read_source_context assertions.
      '--cpu-prof-interval',
      '200',
      BENCH,
      `--variant=${variant}`,
    ],
    {},
  );

  const summary = await verifyVariant(outDir, variant);
  console.log(
    `--- ${variant}: ${summary.fileCount} profile(s), main thread ${summary.mainThreadFile} ` +
      `(${summary.mainThreadSamples} samples)`,
  );
  return summary;
}

async function main() {
  const only = process.argv.slice(2).find((arg) => arg.startsWith('--only='));
  const wanted = only ? only.slice('--only='.length) : null;
  const targets = wanted ? VARIANTS.filter((v) => v === wanted) : VARIANTS;

  if (targets.length === 0) {
    throw new Error(`unknown variant '${wanted}' (expected slow or fast)`);
  }

  await mkdir(ARTIFACTS, { recursive: true });

  const results = [];
  for (const variant of targets) {
    results.push(await collectVariant(variant));
  }

  await writeFile(
    join(ARTIFACTS, 'summary.json'),
    `${JSON.stringify({ collectedAt: new Date().toISOString(), results }, null, 2)}\n`,
    'utf8',
  );

  console.log(`\nprofile artifacts ready under ${ARTIFACTS}`);
}

main().catch((error) => {
  console.error(`\nprofile collection failed: ${error.message}`);
  process.exitCode = 1;
});
