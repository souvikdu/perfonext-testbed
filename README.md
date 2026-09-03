# perfonext-testbed

Synthetic ground-truth harness for the sibling perfonext MCP servers. It compares a baseline
Next.js app with a deliberately regressed version and asserts tool output against
`harness/expected-findings.json`.

## Lanes

- `build`: Next.js manifests, emitted chunks, and webpack module stats through build-mcp.
- `profiler`: V8 CPU profiles through profiler-mcp.
- `render`: live react-scan/lite captures through render-mcp.
- `adversarial`: malformed and degenerate inputs against build-mcp and profiler-mcp.

Run all artifact-producing lanes with `npm run collect:all`. Run an individual verification lane
with `npm run harness:build`, `npm run harness:profiler`, or `npm run harness:render`; use
`node harness/run.mjs --lane=adversarial` for the adversarial lane.

## Render Builds

Build analysis deliberately excludes react-scan and profiling hooks so its artifacts stay
byte-stable. Render collection uses a separate profiling build for each app:

```sh
PERFONEXT_INSTRUMENT=1 npm --workspace @testbed/baseline run build:render
PERFONEXT_INSTRUMENT=1 npm --workspace @testbed/regressed run build:render
npm run harness:render
```

The render lane launches headed Chromium. Install it once with `npx playwright install chromium`.
Headless capture is just as exact, but headless Chromium pins `requestAnimationFrame` to 60Hz, so it
records fewer animation-driven commits than the commit-count thresholds are calibrated for. The
profiling build is required either way: a normal `next start` build can complete a capture with zero
commits and no useful diagnostic.

Optional headless capture is `PERFONEXT_RENDER_HEADLESS=1 npm run harness:render` (or the same env
on `npm run collect:render`). Headless stays exact; commit-count thresholds are still calibrated for
headed.

## Results

`harness/run.mjs` writes `harness/reports/latest.json` and reports each fixture as:

- `PASS`: the expected behavior or finding was observed.
- `known-bug`: a documented MCP-server defect was reproduced (`expectedFail: true`), so it does
  not fail the run.
- `NO FIXTURE`: the planned test case is not yet planted (`pendingFixture: true`).
- `NOW FIXED`: an expected failure now passes and the review/manifest needs updating.
- `FAIL`: an unexpected regression; this makes the command exit non-zero.
