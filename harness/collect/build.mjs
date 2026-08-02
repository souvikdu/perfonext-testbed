#!/usr/bin/env node
// Build lane collection.
//
// Produces the artifacts perfonext-build-mcp consumes:
//   artifacts/build/<variant>/.next/            (manifests + emitted chunks + stats.json)
//   artifacts/build/<variant>/build-output.txt  (captured `next build` stdout, for buildDurationMs)
//
// The `.next` directory is COPIED rather than referenced in place so a later
// `next build` cannot silently mutate an artifact the harness already asserted on.
//
// Guards, in order of how badly they burned us:
//   1. stats.json must be > 1 MB. A 30 KB stats.json is the signature of the
//      StatsWriterPlugin racing across the client/server/edge compilers.
//   2. Every chunk must carry an `id`. Without webpack `ids: true` the file
//      parses fine and yields nothing, with no error anywhere.
//   3. modules[] must be non-trivial. Without a large `modulesSpace` webpack
//      collapses the module list into a summary string.

import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ARTIFACTS = join(ROOT, 'artifacts', 'build');

const VARIANTS = [
  { name: 'baseline', workspace: '@testbed/baseline', dir: join(ROOT, 'apps', 'baseline') },
  { name: 'regressed', workspace: '@testbed/regressed', dir: join(ROOT, 'apps', 'regressed') },
];

const MIN_STATS_BYTES = 1_000_000;

// On Windows, `npm` resolves to npm.cmd. Spawning a .cmd file via
// child_process.spawn() without a shell throws `spawn EINVAL` on Node >= 22, and
// with a shell it hits the CVE-2024-27980 command validation. Instead of chasing
// .cmd shims, spawn node.exe with npm's real CLI: npm sets `npm_execpath` in the
// environment of every script it runs, which covers the documented `npm run
// collect:*` invocation paths.
function npmRun(args, options = {}) {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    return run(process.execPath, [npmCli, ...args], options);
  }
  // Direct invocation outside npm: fall back to a shell on Windows.
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return run(command, args, { ...options, shell: process.platform === 'win32' });
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function verifyStats(statsPath, variant) {
  const raw = await readFile(statsPath, 'utf8');

  if (raw.length < MIN_STATS_BYTES) {
    throw new Error(
      `[${variant}] stats.json is ${raw.length} bytes (expected > ${MIN_STATS_BYTES}).\n` +
        'This is almost always the StatsWriterPlugin racing across the client/server/edge ' +
        'compilers, which all write the same filename. Gate the plugin on `!isServer`.',
    );
  }

  const stats = JSON.parse(raw);
  const modules = Array.isArray(stats.modules) ? stats.modules : [];
  const chunks = Array.isArray(stats.chunks) ? stats.chunks : [];

  if (modules.length === 0) {
    throw new Error(
      `[${variant}] stats.json parsed but modules[] is empty. ` +
        'Set webpack stats `modulesSpace: Infinity` — the default collapses the module list.',
    );
  }

  if (chunks.length === 0) {
    throw new Error(`[${variant}] stats.json parsed but chunks[] is empty.`);
  }

  const withoutId = chunks.filter((chunk) => chunk.id === undefined || chunk.id === null);
  if (withoutId.length > 0) {
    throw new Error(
      `[${variant}] ${withoutId.length}/${chunks.length} chunks have no \`id\`. ` +
        'Set webpack stats `ids: true` — without it every attribution tool silently ' +
        'returns nothing instead of erroring.',
    );
  }

  const withReasons = modules.filter(
    (module) => Array.isArray(module.reasons) && module.reasons.length > 0,
  );
  if (withReasons.length === 0) {
    throw new Error(
      `[${variant}] no module carries reasons[]. trace_import cannot work. ` +
        'Set webpack stats `reasons: true`.',
    );
  }

  return {
    statsBytes: raw.length,
    moduleCount: modules.length,
    chunkCount: chunks.length,
    modulesWithReasons: withReasons.length,
  };
}

async function collectVariant(variant) {
  console.log(`\n=== building ${variant.workspace}`);

  // The regressed app imports a generated stylesheet that is deliberately gitignored.
  const generator = join(variant.dir, 'scripts', 'generate-bloat-css.mjs');
  if (existsSync(generator)) {
    await run(process.execPath, [generator]);
  }

  await rm(join(variant.dir, '.next'), { recursive: true, force: true });

  const { stdout, stderr } = await npmRun(['run', 'build', '--workspace', variant.workspace], {
    env: { ANALYZE: 'true' },
  });

  const nextDir = join(variant.dir, '.next');
  const statsPath = join(nextDir, 'stats.json');

  if (!existsSync(statsPath)) {
    throw new Error(
      `[${variant.name}] ${statsPath} was not written. ` +
        'Was ANALYZE=true set, and is StatsWriterPlugin wired into next.config.ts?',
    );
  }

  const summary = await verifyStats(statsPath, variant.name);

  const outDir = join(ARTIFACTS, variant.name);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // Skip the compiler cache: it is enormous and nothing reads it.
  await cp(nextDir, join(outDir, '.next'), {
    recursive: true,
    filter: (source) => !source.includes(`${join('.next', 'cache')}`),
  });

  await writeFile(join(outDir, 'build-output.txt'), `${stdout}\n${stderr}`, 'utf8');

  console.log(
    `--- ${variant.name}: ${summary.moduleCount} modules, ${summary.chunkCount} chunks, ` +
      `${summary.modulesWithReasons} with reasons, stats.json ${summary.statsBytes} bytes`,
  );

  return { variant: variant.name, buildDir: join(outDir, '.next'), ...summary };
}

async function main() {
  const only = process.argv.slice(2).find((arg) => arg.startsWith('--only='));
  const wanted = only ? only.slice('--only='.length) : null;
  const targets = wanted ? VARIANTS.filter((v) => v.name === wanted) : VARIANTS;

  if (targets.length === 0) {
    throw new Error(`unknown variant '${wanted}' (expected baseline or regressed)`);
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

  console.log(`\nbuild artifacts ready under ${ARTIFACTS}`);
}

main().catch((error) => {
  console.error(`\nbuild collection failed: ${error.message}`);
  process.exitCode = 1;
});
