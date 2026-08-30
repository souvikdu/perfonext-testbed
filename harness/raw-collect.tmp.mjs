// Drives the regressed app against render-mcp's real ingest server, in-process,
// so we can inspect the normalized fiber depth/duration structure of each commit.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

import {
  createCaptureSession,
  getServerPort,
  stopIngestServer,
} from '../../perfonext-render-mcp/dist/ingest/server.js';

const ROOT = '/Users/soudutta2/Desktop/Prep/perfonext/perfonext-testbed';
const app = spawn(process.execPath, [`${ROOT}/node_modules/next/dist/bin/next`, 'start'], {
  cwd: `${ROOT}/apps/regressed`,
  env: { ...process.env, PORT: '3200' },
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 5000));

const session = await createCaptureSession();
const port = getServerPort();
const endpoint = `http://127.0.0.1:${port}/ingest/${session.sessionId}`;

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.addInitScript(
  ([e, s]) => {
    window.__PERFONEXT__ = { endpoint: e, sessionId: s };
  },
  [endpoint, session.sessionId],
);

await page.goto('http://127.0.0.1:3200/trails', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="trail-explorer"]');
await page.waitForTimeout(1500);

const query = page.locator('[data-testid="query-input"]');
for (const text of ['ridge', 'cedar', 'spur']) {
  await query.fill('');
  await query.pressSequentially(text, { delay: 60 });
  await page.waitForTimeout(250);
}

const region = page.locator('[data-testid="region-select"]');
for (const option of await region.locator('option').all()) {
  const value = await option.getAttribute('value');
  if (value) {
    await region.selectOption(value);
    await page.waitForTimeout(120);
  }
}

await query.fill('');
await query.pressSequentially('trail', { delay: 60 });
await page.waitForTimeout(500);
await page.waitForTimeout(1000);

await browser.close();
await stopIngestServer();
app.kill();

console.log('commits captured:', session.commits.length);

for (const c of session.commits.slice(0, 5)) {
  const f = c.fibers;
  const depths = f.map((x) => x.depth);
  const depth0 = f.filter((x) => x.depth === 0);

  let orphanTotal = 0;
  const orphans = [];
  const stack = [];
  f.forEach((fiber, i) => {
    while (stack.length && f[stack[stack.length - 1]].depth >= fiber.depth) stack.pop();
    if (stack.length === 0) {
      orphanTotal += fiber.actualDuration;
      orphans.push(`${fiber.name}@d${fiber.depth}=${fiber.actualDuration}`);
    }
    stack.push(i);
  });

  console.log(`\ncommit#${c.commitIndex} fibers=${f.length} duration=${c.duration.toFixed(2)}`);

  // React leaves actualDuration stale on fibers that bailed out; a fiber only rendered
  // in this commit if its actualStartTime is at/after the root's.
  const rootStart = f[0].actualStartTime;
  const rendered = f.map((x) => x.actualStartTime >= rootStart);
  const child2 = new Array(f.length).fill(0);
  const st = [];
  f.forEach((fiber, i) => {
    while (st.length && f[st[st.length - 1]].depth >= fiber.depth) st.pop();
    const p = st[st.length - 1];
    if (p !== undefined && rendered[i]) child2[p] += fiber.actualDuration;
    st.push(i);
  });
  const selfFiltered = f.reduce(
    (s, x, i) => s + (rendered[i] ? Math.max(0, x.actualDuration - child2[i]) : 0),
    0,
  );
  const negatives = f.filter((x, i) => x.actualDuration - child2[i] < -0.001).length;
  console.log(
    `  rendered=${rendered.filter(Boolean).length}/${f.length} selfFiltered=${selfFiltered.toFixed(2)} negativeNodes=${negatives}`,
  );
  console.log(`  depth range ${Math.min(...depths)}..${Math.max(...depths)}`);
  console.log(`  first 15 depths: ${depths.slice(0, 15).join(',')}`);
  console.log(
    `  depth0 fibers=${depth0.length} sum=${depth0.reduce((s, x) => s + x.actualDuration, 0).toFixed(2)}`,
  );
  console.log(`  orphans=${orphans.length} orphanTotal=${orphanTotal.toFixed(2)}`);
  console.log(`  orphan list: ${orphans.slice(0, 10).join(', ')}`);
  console.log(
    `  first 10: ${f
      .slice(0, 10)
      .map((x) => `${x.name}@d${x.depth}:${x.actualDuration}`)
      .join(' | ')}`,
  );
  console.log(`  selfSum=${f.reduce((s, x) => s + x.selfDuration, 0).toFixed(2)}`);
}
