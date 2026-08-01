// P8 — worker_threads fixture. Node's --cpu-prof emits ONE .cpuprofile per thread,
// so running this produces several files from a single command. Fixture for the
// deferred profiler-mcp multi-file ingestion roadmap item.

import { parentPort, workerData } from 'node:worker_threads';
import { generateTrails } from '@testbed/data';

import { scoreAll } from './slow/scoring.mjs';
import { aggregateByRegion } from './slow/aggregate.mjs';
import * as fast from './fast/index.mjs';

const { variant = 'slow', count = 1200, seed = 20260731, shard = 0 } = workerData ?? {};
const trails = generateTrails(count, seed + shard);

const result =
  variant === 'fast'
    ? { scores: fast.scoreAll(trails).length, regions: fast.aggregateByRegion(trails).length }
    : { scores: scoreAll(trails).length, regions: aggregateByRegion(trails).length };

parentPort?.postMessage({ shard, ...result });
