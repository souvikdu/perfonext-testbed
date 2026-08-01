#!/usr/bin/env node
// Render lane collection — standalone smoke test.
//
// Unlike the build and profile lanes this does not leave a reusable artifact behind:
// a render profile lives in the render-mcp process's in-memory store and dies with it.
// So this script exists to prove the capture path works end to end and to record the
// resulting summaries under artifacts/render/, while run.mjs performs the real
// assertions by capturing its own session against a live server.
//
// Requires: the apps to be built (`npm run collect:build`) and Playwright's Chromium
// to be installed (`npx playwright install chromium`).

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { callTool, connectServer } from '../lib/mcp-client.mjs';
import { captureRenderSession } from '../lib/render-session.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ARTIFACTS = join(ROOT, 'artifacts', 'render');

const VARIANTS = ['baseline', 'regressed'];

async function collectVariant(client, variant) {
  console.log(`\n=== capturing ${variant}`);
  const captured = await captureRenderSession({ client, variant });

  const summary = await callTool(client, 'get_render_summary', { profileId: captured.profileId });
  const slow = await callTool(client, 'get_slow_components', {
    profileId: captured.profileId,
    limit: 10,
  });
  const causes = await callTool(client, 'get_rerender_causes', {
    profileId: captured.profileId,
    limit: 25,
  });
  const commits = await callTool(client, 'get_hot_commits', {
    profileId: captured.profileId,
    limit: 5,
  });

  const outDir = join(ARTIFACTS, variant);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, 'capture.json'),
    `${JSON.stringify(
      {
        captured,
        summary: summary.json,
        slowComponents: slow.json,
        rerenderCauses: causes.json,
        hotCommits: commits.json,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(
    `--- ${variant}: profileId=${captured.profileId} dataQuality=${captured.dataQuality} ` +
      `commits=${summary.json?.commitCount ?? '?'} components=${summary.json?.componentCount ?? '?'}`,
  );

  if (captured.dataQuality !== 'exact') {
    console.warn(
      `--- ${variant}: dataQuality is '${captured.dataQuality}', not 'exact'. ` +
        'Exact causes need a headed browser and react-scan changeDescription data.',
    );
  }

  return { variant, profileId: captured.profileId, dataQuality: captured.dataQuality };
}

async function main() {
  const only = process.argv.slice(2).find(arg => arg.startsWith('--only='));
  const wanted = only ? only.slice('--only='.length) : null;
  const targets = wanted ? VARIANTS.filter(v => v === wanted) : VARIANTS;

  if (targets.length === 0) {
    throw new Error(`unknown variant '${wanted}' (expected baseline or regressed)`);
  }

  await mkdir(ARTIFACTS, { recursive: true });

  const { client, close } = await connectServer('render');
  const results = [];

  try {
    for (const variant of targets) {
      results.push(await collectVariant(client, variant));
    }
  } finally {
    await close();
  }

  await writeFile(
    join(ARTIFACTS, 'summary.json'),
    `${JSON.stringify({ collectedAt: new Date().toISOString(), results }, null, 2)}\n`,
    'utf8',
  );

  console.log(`\nrender artifacts ready under ${ARTIFACTS}`);
}

main().catch(error => {
  console.error(`\nrender collection failed: ${error.message}`);
  process.exitCode = 1;
});
