// Drives a live react-scan/lite capture against one of the testbed apps.
//
// Shared by collect/render.mjs (standalone) and run.mjs (verification), because a
// render profile only exists inside the running MCP server's store — unlike the build
// and profile lanes, there is no file on disk to hand over. Whoever wants to assert on
// a render profile has to be the same process that captured it.
//
// Two operational facts drive the shape of this file:
//   1. Playwright runs headed by default, and the expected-findings commit-count
//      thresholds are calibrated against that. Headless capture is equally exact
//      (react-scan/lite installs the profiling hook itself), but headless Chromium pins
//      requestAnimationFrame to 60Hz, so the animation-driven commits produced by the
//      interaction script roughly halve on a 120Hz display and undershoot the R1 bound.
//   2. The instrumentation reads window.__PERFONEXT__, injected via addInitScript, so
//      the app does not need rebuilding per session.

import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { callTool } from './mcp-client.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

export const APPS = {
  baseline: { dir: join(ROOT, 'apps', 'baseline'), port: 3100 },
  regressed: { dir: join(ROOT, 'apps', 'regressed'), port: 3200 },
};

function waitForExit(child) {
  return new Promise((resolvePromise) => child.once('exit', resolvePromise));
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) {
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`${url} did not become ready within ${timeoutMs}ms`);
}

async function startApp(variant) {
  const app = APPS[variant];
  if (!app) {
    throw new Error(`unknown app variant '${variant}'`);
  }

  const baseUrl = `http://127.0.0.1:${app.port}`;
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) });
    if (response.ok) {
      throw new Error(
        `${baseUrl} is already serving. Stop the leftover process on port ${app.port} before the render lane.`,
      );
    }
  } catch (error) {
    if (String(error.message).includes('already serving')) {
      throw error;
    }
  }

  const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(process.execPath, [nextBin, 'start'], {
    cwd: app.dir,
    env: { ...process.env, PORT: String(app.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', () => {});
  let stderrText = '';
  child.stderr.on('data', (chunk) => {
    stderrText += String(chunk);
    process.stderr.write(chunk);
  });

  try {
    await waitForServer(baseUrl);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(
      `${error.message}. Did you run the build lane first? \`next start\` needs a .next directory.`,
    );
  }

  if (/EADDRINUSE/i.test(stderrText)) {
    child.kill('SIGTERM');
    throw new Error(
      `${baseUrl} was already in use (EADDRINUSE). Stop the leftover next-server on port ${app.port} and retry.`,
    );
  }

  return {
    baseUrl,
    async stop() {
      child.kill('SIGTERM');
      await Promise.race([waitForExit(child), new Promise((r) => setTimeout(r, 5_000))]);
      child.kill('SIGKILL');
    },
  };
}

/**
 * Scripted interaction sequence.
 *
 * The point is volume and variety of commits, not realism: the regressed explorer
 * recreates its context value on every render, so each keystroke fans out through the
 * whole tree. Typing character by character (delay > 0) is what produces the commit
 * count the render tools need; a single fill() would produce one commit.
 */
async function driveInteractions(page, baseUrl) {
  await page.goto(`${baseUrl}/trails`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="trail-explorer"]');

  // Give the dynamic import of react-scan/lite time to install its hooks before any
  // interaction — events emitted before instrument() resolves are simply lost.
  await page.waitForTimeout(1_500);

  // Fail loudly here rather than at stop_render_capture with an unexplained
  // commitCount: 0. The usual cause is an app built before the instrument component
  // was last changed, since the bundle is baked at build time.
  const injected = await page.evaluate(() => Boolean(window.__PERFONEXT__));
  if (!injected) {
    throw new Error(
      'window.__PERFONEXT__ is not set in the page. addInitScript did not run before app code.',
    );
  }

  // instrument() runs at module scope, so by the time the page is interactive this is
  // already decided. Checking it here turns a silent commitCount: 0 into a real error.
  const state = await page.evaluate(() => window.__PERFONEXT_STATE__ ?? 'never ran');
  if (state !== 'instrumented') {
    throw new Error(
      `ReactScanInstrument did not instrument (state: ${state}). ` +
        'Rebuild the app with PERFONEXT_INSTRUMENT=1 — otherwise react-scan/lite is ' +
        'aliased to a no-op stub so the build lane can measure the app alone.',
    );
  }

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

  const regionValues = await region
    .locator('option')
    .evaluateAll((options) => options.slice(0, 2).map((option) => option.value));
  for (let index = 0; index < 8; index += 1) {
    await region.selectOption(regionValues[index % regionValues.length]);
    await page.waitForTimeout(120);
  }

  const difficulty = page.locator('[data-testid="difficulty-select"]');
  for (const option of (await difficulty.locator('option').all()).slice(0, 3)) {
    const value = await option.getAttribute('value');
    if (value) {
      await difficulty.selectOption(value);
      await page.waitForTimeout(120);
    }
  }

  await query.fill('');
  await query.pressSequentially('trail', { delay: 60 });
  await page.waitForTimeout(500);

  // Let the last commit flush to the ingest endpoint.
  await page.waitForTimeout(1_000);
}

/**
 * Full live capture. Returns the stop_render_capture payload plus the sessionId.
 *
 * @param {object} options
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} options.client connected render-mcp client
 * @param {'baseline'|'regressed'} options.variant
 * @param {boolean} [options.headless] data quality is unaffected, but commit counts drop
 *   (see the note at the top of this file); defaults to false to match the calibrated thresholds
 */
export async function captureRenderSession({ client, variant, headless = false }) {
  const begin = await callTool(client, 'begin_render_analysis', { approach: 'live' });
  if (!begin.json?.sessionId) {
    throw new Error(`begin_render_analysis returned no sessionId: ${begin.text}`);
  }

  const { sessionId, endpoint } = begin.json;

  await callTool(client, 'run_render_capture', { sessionId, method: 'test-suite' });

  const app = await startApp(variant);
  const browser = await chromium.launch({ headless });

  try {
    const context = await browser.newContext();
    await context.addInitScript(
      ([injectedEndpoint, injectedSessionId]) => {
        window.__PERFONEXT__ = { endpoint: injectedEndpoint, sessionId: injectedSessionId };
      },
      [endpoint, sessionId],
    );

    const page = await context.newPage();

    // Without this, a failed `import('react-scan/lite')` inside the instrument
    // component is completely silent and the only symptom is commitCount: 0.
    page.on('pageerror', (error) => console.error(`[page error] ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        const location = message.location();
        const source = location.url ? ` ${location.url}` : '';
        console.error(`[page ${message.type()}] ${message.text()}${source}`);
      }
    });
    page.on('requestfailed', (request) => {
      console.error(`[requestfailed] ${request.url()} ${request.failure()?.errorText}`);
    });

    // A 404 is a successful HTTP response, so requestfailed never fires for it. Without
    // this, a wrong ingest URL or a missing chunk shows up only as commitCount: 0.
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.error(`[http ${response.status()}] ${response.url()}`);
      }
    });

    let ingestPosts = 0;
    page.on('request', (request) => {
      if (request.url().includes('/ingest/')) ingestPosts += 1;
    });

    await driveInteractions(page, app.baseUrl);
    console.log(`--- ${variant}: ${ingestPosts} request(s) to the ingest endpoint`);
    await context.close();
  } finally {
    await browser.close();
    await app.stop();
  }

  const stopped = await callTool(client, 'stop_render_capture', { sessionId });
  if (!stopped.json?.profileId) {
    throw new Error(
      `stop_render_capture returned no profileId: ${stopped.text}\n` +
        'The usual cause is that no events reached the ingest server — check that ' +
        'ReactScanInstrument mounted and that react-scan is installed in the app.',
    );
  }

  if (headless) {
    console.warn(
      'NOTE: captured headless. dataQuality is still "exact", but requestAnimationFrame is ' +
        'pinned to 60Hz, so commit counts run lower than the calibrated thresholds expect.',
    );
  }

  return { sessionId, variant, ...stopped.json };
}
