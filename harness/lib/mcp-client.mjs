// Thin wrapper around the MCP SDK stdio client.
//
// Every server in this workspace is a stdio server whose entry point is dist/index.js,
// so connecting is always `node <repo>/dist/index.js`. The servers are siblings of the
// testbed, not dependencies of it, and are resolved by path.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TESTBED_ROOT = resolve(HERE, '..', '..');
const SIBLINGS = resolve(TESTBED_ROOT, '..');

export const SERVERS = {
  build: { repo: 'perfonext-build-mcp', label: 'build' },
  profiler: { repo: 'perfonext-profiler-mcp', label: 'profiler' },
  render: { repo: 'perfonext-render-mcp', label: 'render' },
};

export function serverEntryPoint(which) {
  const server = SERVERS[which];
  if (!server) {
    throw new Error(`unknown server '${which}' (expected build, profiler or render)`);
  }

  const entry = join(SIBLINGS, server.repo, 'dist', 'index.js');
  if (!existsSync(entry)) {
    throw new Error(
      `${entry} does not exist. Run \`npm run build\` in ${join(SIBLINGS, server.repo)} first — ` +
        'the harness drives the compiled server, not the TypeScript sources.',
    );
  }

  return entry;
}

/** Ask the OS for a free port, then release it. */
export function findFreePort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const probe = createServer();
    probe.on('error', rejectPromise);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolvePromise(port));
    });
  });
}

export async function connectServer(which, options = {}) {
  const entry = serverEntryPoint(which);
  const env = { ...process.env, ...options.env };

  // render-mcp binds a fixed ingest port (7721) with no isolation, so a server running
  // in the editor will hold it and begin_render_analysis fails outright. The harness
  // always takes its own ephemeral port rather than fighting over the default.
  if (which === 'render' && !env.PERFONEXT_INGEST_PORT) {
    env.PERFONEXT_INGEST_PORT = String(await findFreePort());
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry],
    env,
    stderr: 'pipe',
  });

  const client = new Client({ name: 'perfonext-testbed-harness', version: '0.1.0' }, {});
  await client.connect(transport);

  transport.stderr?.on('data', (chunk) => process.stderr.write(`[${which}-mcp] ${chunk}`));

  return {
    client,
    ingestPort: env.PERFONEXT_INGEST_PORT ?? null,
    async close() {
      await client.close();
    },
  };
}

/**
 * Call a tool and return its parsed JSON payload.
 *
 * Every tool in these servers replies with a single text content block. Most hold
 * JSON; the collection-recipe tools return prose. `text` is always returned so a
 * caller can assert on either, and `json` is null for the prose ones.
 */
export async function callTool(client, name, args) {
  const response = await client.callTool({ name, arguments: args });

  const text = (response.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { isError: response.isError === true, text, json };
}

export async function listToolNames(client) {
  const { tools } = await client.listTools();
  return tools.map((tool) => tool.name).sort();
}
