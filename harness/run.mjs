#!/usr/bin/env node
// Verification harness: replays every collected artifact through the MCP servers and
// checks the result against harness/expected-findings.json.
//
// The point is that a "finding" is only real if it is asserted. Running the tools and
// eyeballing the output proves nothing, because a plausible-looking answer and a correct
// answer are indistinguishable without ground truth.
//
// Usage:
//   node harness/run.mjs                 all lanes
//   node harness/run.mjs --lane=build    one lane (build | profiler | render | adversarial)

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { callTool, connectServer } from './lib/mcp-client.mjs';
import { captureRenderSession } from './lib/render-session.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ARTIFACTS = join(ROOT, 'artifacts');
const FIXTURES = join(ROOT, 'fixtures', 'adversarial');

// ── assertion engine ────────────────────────────────────────────────────────────

/** Resolve a dot path. `[*]` flattens an array; `[n]` selects one element. */
function resolvePath(root, path) {
  let current = [root];
  for (const segment of path.split('.')) {
    const match = segment.match(/^([^[]+)\[(\*|\d+)\]$/);
    const key = match ? match[1] : segment;

    current = current.flatMap(value => {
      if (value === null || value === undefined) return [];
      const next = value[key];
      return next === undefined ? [] : [next];
    });

    if (match) {
      current =
        match[2] === '*'
          ? current.flatMap(value => (Array.isArray(value) ? value : [value]))
          : current.flatMap(value => {
              const picked = Array.isArray(value) ? value[Number(match[2])] : undefined;
              return picked === undefined ? [] : [picked];
            });
    }
  }
  return current;
}

/**
 * Assertions that cannot be expressed as a path comparison because they relate two
 * fields to each other. Kept here rather than in the JSON so the manifest stays
 * declarative.
 */
const CUSTOM = {
  // A package cannot be bigger than the chunk it lives in. Fails today because module
  // sizes are raw and chunk sizes are emitted.
  packageBytesWithinChunk(json) {
    const offenders = [];
    for (const chunk of json?.sharedChunks ?? []) {
      for (const pkg of chunk.topPackages ?? []) {
        if (typeof pkg.bytes === 'number' && pkg.bytes > chunk.sizeBytes) {
          offenders.push(
            `${pkg.packageName} ${pkg.bytes}B inside ${chunk.chunkPath} of ${chunk.sizeBytes}B`,
          );
        }
      }
    }
    return {
      pass: offenders.length === 0,
      detail: offenders.length ? offenders[0] : 'all packages fit within their chunk',
    };
  },

  // The window must actually contain the ticks it is reporting.
  hotLinesVisible(json) {
    const lines = json?.lines ?? [];
    const withTicks = lines.filter(line => line.ticks > 0);
    const total = json?.totalTicks ?? 0;
    const shown = withTicks.reduce((sum, line) => sum + line.ticks, 0);
    return {
      pass: total > 0 && shown / total > 0.5,
      detail: `window ${json?.startLine}-${json?.endLine} shows ${shown} of ${total} ticks`,
    };
  },
};

/** JS has no inline (?i) flag, so translate the prefix into a real flag. */
function toRegExp(pattern) {
  return pattern.startsWith('(?i)')
    ? new RegExp(pattern.slice(4), 'i')
    : new RegExp(pattern);
}

function evaluate(assertion, ctx) {
  const { path, op, value } = assertion;

  if (path === '$custom') {
    return CUSTOM[op](ctx.json);
  }
  if (path === '$response') {
    const pass = op === 'isError' ? ctx.isError : !ctx.isError;
    return { pass, detail: `isError=${ctx.isError} ${String(ctx.text).slice(0, 120)}` };
  }
  if (path === '$text') {
    const pass = toRegExp(value).test(ctx.text);
    return { pass, detail: `text ${pass ? 'matched' : 'did not match'} /${value}/` };
  }

  const found = resolvePath(ctx.json, path);
  const detail = `${path} => ${JSON.stringify(found).slice(0, 160)}`;

  switch (op) {
    case 'includes':
      return { pass: found.some(v => String(v) === String(value)), detail };
    case 'notIncludes':
      return { pass: !found.some(v => String(v) === String(value)), detail };
    case 'equals':
      return { pass: found.length > 0 && String(found[0]) === String(value), detail };
    case 'matches':
      return { pass: found.some(v => toRegExp(value).test(String(v))), detail };
    case 'gt':
      return { pass: found.some(v => Number(v) > value), detail };
    case 'gte':
      return { pass: found.some(v => Number(v) >= value), detail };
    case 'lt':
      return { pass: found.some(v => Number(v) < value), detail };
    case 'lte':
      return { pass: found.some(v => Number(v) <= value), detail };
    case 'lengthGte': {
      const arr = found[0];
      return { pass: Array.isArray(arr) && arr.length >= value, detail };
    }
    default:
      throw new Error(`unknown op '${op}'`);
  }
}

function check(entry, ctx, results) {
  const failures = [];
  for (const assertion of entry.assert) {
    const { pass, detail } = evaluate(assertion, ctx);
    if (!pass) failures.push(detail);
  }

  const passed = failures.length === 0;
  const expectedFail = entry.expectedFail === true;

  let state;
  if (entry.pendingFixture === true) state = 'PENDING';
  else if (passed && !expectedFail) state = 'pass';
  else if (!passed && expectedFail) state = 'known-bug';
  else if (passed && expectedFail) state = 'FIXED';
  else state = 'FAIL';

  results.push({ id: entry.id, lane: entry.lane, state, title: entry.title, failures });
}

// ── lanes ───────────────────────────────────────────────────────────────────────

async function buildLane(manifest, results) {
  const { client, close } = await connectServer('build');
  try {
    const ids = {};
    for (const variant of ['baseline', 'regressed']) {
      const dir = join(ARTIFACTS, 'build', variant, '.next');
      const loaded = await callTool(client, 'load_build_stats', { buildDir: dir });
      ids[variant] = loaded.json.buildId;
      await callTool(client, 'load_webpack_stats', { buildId: ids[variant] });
    }

    for (const entry of manifest.build) {
      const args =
        entry.target === 'diff'
          ? { baselineBuildId: ids.baseline, currentBuildId: ids.regressed }
          : { buildId: ids[entry.target], limit: 20 };
      check({ ...entry, lane: 'build' }, await callTool(client, entry.tool, args), results);
    }
  } finally {
    await close();
  }
}

async function profilerLane(manifest, results) {
  const summary = JSON.parse(await readFile(join(ARTIFACTS, 'profile', 'summary.json'), 'utf8'));
  const mainFile = variant =>
    join(
      ARTIFACTS,
      'profile',
      variant,
      summary.results.find(r => r.variant === variant).mainThreadFile,
    );

  const { client, close } = await connectServer('profiler');
  try {
    const ids = {};
    for (const variant of ['slow', 'fast']) {
      const loaded = await callTool(client, 'load_profile', { filePath: mainFile(variant) });
      ids[variant] = loaded.json?.profileId;
    }

    for (const entry of manifest.profiler) {
      let ctx;
      if (entry.target === 'slow-dir') {
        ctx = await callTool(client, 'load_profile', {
          filePath: join(ARTIFACTS, 'profile', 'slow'),
        });
      } else {
        const args = { profileId: ids[entry.target], limit: 20 };
        if (entry.tool === 'read_source_context') args.functionName = 'scoreTrail';
        ctx = await callTool(client, entry.tool, args);
      }
      check({ ...entry, lane: 'profiler' }, ctx, results);
    }
  } finally {
    await close();
  }
}

async function renderLane(manifest, results) {
  const { client, close } = await connectServer('render');
  try {
    const ids = {};
    for (const variant of ['baseline', 'regressed']) {
      console.log(`  capturing ${variant} (a headed browser will open)`);
      const captured = await captureRenderSession({ client, variant });
      ids[variant] = captured.profileId;
    }

    for (const entry of manifest.render) {
      const ctx = await callTool(client, entry.tool, {
        profileId: ids[entry.target],
        limit: 20,
      });
      check({ ...entry, lane: 'render' }, ctx, results);
    }
  } finally {
    await close();
  }
}

async function adversarialLane(manifest, results) {
  const fixtures = JSON.parse(await readFile(join(FIXTURES, 'manifest.json'), 'utf8'));
  const byId = Object.fromEntries(fixtures.fixtures.map(f => [f.id, f]));

  const clients = {};
  try {
    for (const entry of manifest.adversarial) {
      clients[entry.server] ??= await connectServer(entry.server);
      const { client } = clients[entry.server];
      const fixture = byId[entry.id];

      let ctx;
      if (entry.server === 'profiler') {
        ctx = await callTool(client, 'load_profile', { filePath: fixture.path });
      } else if (entry.tool === 'load_webpack_stats') {
        // Needs a loaded build first; the collapsed stats live beside real manifests.
        const loaded = await callTool(client, 'load_build_stats', { buildDir: fixture.buildDir });
        ctx = loaded.isError
          ? loaded
          : await callTool(client, 'load_webpack_stats', { buildId: loaded.json.buildId });
      } else {
        ctx = await callTool(client, 'load_build_stats', { buildDir: fixture.buildDir });
      }

      check({ ...entry, lane: 'adversarial' }, ctx, results);
    }
  } finally {
    await Promise.all(Object.values(clients).map(c => c.close()));
  }
}

// ── entry point ─────────────────────────────────────────────────────────────────

const LANES = {
  build: buildLane,
  profiler: profilerLane,
  render: renderLane,
  adversarial: adversarialLane,
};

async function main() {
  const laneArg = process.argv.find(a => a.startsWith('--lane='));
  const wanted = laneArg ? [laneArg.slice('--lane='.length)] : Object.keys(LANES);

  const manifest = JSON.parse(await readFile(join(HERE, 'expected-findings.json'), 'utf8'));
  const results = [];

  for (const lane of wanted) {
    if (!LANES[lane]) throw new Error(`unknown lane '${lane}'`);
    console.log(`\n=== ${lane} lane`);
    try {
      await LANES[lane](manifest, results);
    } catch (error) {
      console.error(`  ${lane} lane aborted: ${error.message}`);
      results.push({ id: `${lane}-lane`, lane, state: 'FAIL', title: 'lane aborted', failures: [error.message] });
    }
  }

  const icon = {
    pass: 'PASS      ',
    'known-bug': 'KNOWN BUG ',
    FIXED: 'NOW FIXED ',
    PENDING: 'NO FIXTURE',
    FAIL: 'FAIL      ',
  };
  console.log('\n=== results');
  for (const r of results) {
    console.log(`${icon[r.state]} [${r.lane}] ${r.id}  ${r.title}`);
    for (const f of r.failures) console.log(`             ${f}`);
  }

  const tally = key => results.filter(r => r.state === key).length;
  console.log(
    `\npass=${tally('pass')}  known-bug=${tally('known-bug')}  no-fixture=${tally('PENDING')}  newly-fixed=${tally('FIXED')}  fail=${tally('FAIL')}`,
  );

  if (tally('FIXED') > 0) {
    console.log(
      '\nSome expectedFail entries now pass. The underlying MCP bug was fixed — ' +
        'remove expectedFail from those entries so they stay enforced.',
    );
  }

  const reportDir = join(HERE, 'reports');
  await mkdir(reportDir, { recursive: true });
  await writeFile(
    join(reportDir, 'latest.json'),
    `${JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2)}\n`,
  );

  process.exitCode = tally('FAIL') > 0 ? 1 : 0;
}

if (!existsSync(ARTIFACTS)) {
  console.error('artifacts/ is missing. Run the collection scripts first.');
  process.exit(1);
}

main().catch(error => {
  console.error(`harness failed: ${error.message}`);
  process.exitCode = 1;
});
