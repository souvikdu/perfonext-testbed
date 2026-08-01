#!/usr/bin/env node
// Profiler lane workload.
//
// Run under `node --cpu-prof`; see profile.mjs, which is what the harness invokes.
// This file is deliberately thin: everything expensive lives in @testbed/compute so
// the resulting .cpuprofile frames point at hand-written source with stable line
// numbers, which is what read_source_context is asserted against.
//
//   --variant=slow|fast   which implementation set to exercise (default slow)
//   --trails=<n>          dataset size on the main thread (default 3500)
//   --passes=<n>          repeats of the main-thread workload (default 3)
//   --workers=<n>         extra worker_threads to spawn (default 2)
//
// The workers exist so a single command emits several .cpuprofile files — Node writes
// one per thread. That is the multi-file ingestion fixture.

import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';

import { generateTrails } from '@testbed/data';
import { runWorkload } from '@testbed/compute';

const require = createRequire(import.meta.url);
const WORKER_PATH = require.resolve('@testbed/compute/worker');

function flag(name, fallback) {
  const match = process.argv.slice(2).find(arg => arg.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : fallback;
}

const variant = flag('variant', 'slow');
const trailCount = Number(flag('trails', '3500'));
const passes = Number(flag('passes', '3'));
const workerCount = Number(flag('workers', '2'));

if (variant !== 'slow' && variant !== 'fast') {
  throw new Error(`--variant must be slow or fast, got '${variant}'`);
}

function spawnWorker(shard) {
  return new Promise((resolvePromise, rejectPromise) => {
    const worker = new Worker(WORKER_PATH, {
      workerData: { variant, count: 1200, seed: 20260731, shard },
    });
    let payload = null;
    worker.on('message', message => {
      payload = message;
    });
    worker.on('error', rejectPromise);
    worker.on('exit', code => {
      if (code === 0) {
        resolvePromise(payload);
        return;
      }
      rejectPromise(new Error(`worker ${shard} exited with code ${code}`));
    });
  });
}

async function main() {
  const started = Date.now();
  const trails = generateTrails(trailCount);

  const workers = Array.from({ length: workerCount }, (_, index) => spawnWorker(index + 1));

  // Repeated passes rather than one huge dataset: the sampler needs wall-clock time
  // on each hot line, and a bigger dataset would push findNearbyTrails (which is
  // quadratic on purpose) into dominating everything else.
  let result = null;
  for (let pass = 0; pass < passes; pass += 1) {
    result = runWorkload(trails, variant);
  }

  const shards = await Promise.all(workers);

  console.log(
    JSON.stringify(
      {
        variant,
        trailCount,
        passes,
        workerCount,
        durationMs: Date.now() - started,
        result,
        shards,
      },
      null,
      2,
    ),
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
