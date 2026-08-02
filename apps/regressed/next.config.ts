import type { NextConfig } from 'next';
import { join } from 'node:path';
import { StatsWriterPlugin } from 'webpack-stats-plugin';

const nextConfig: NextConfig = {
  transpilePackages: ['@testbed/ui', '@testbed/data'],
  // Keeps the compute package out of the server bundle so CPU-profile frames point
  // at real, unbundled source lines.
  serverExternalPackages: ['@testbed/compute'],
  // B4 DEFECT: optimizePackageImports is absent, so the react-feather barrel is
  // pulled in whole on every route that imports from it.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack(config, { isServer }) {
    if (!isServer && process.env.PERFONEXT_INSTRUMENT === '1') {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = typeof originalEntry === 'function' ? await originalEntry() : originalEntry;
        const mainApp = entries['main-app'];
        const imports = Array.isArray(mainApp) ? mainApp : mainApp.import;
        const instrument = join(process.cwd(), 'src', 'app', 'ReactScanInstrument.tsx');

        if (!imports.includes(instrument)) {
          imports.unshift(instrument);
        }
        return entries;
      };
    }

    // See apps/baseline/next.config.ts — react-scan is only bundled for the render lane.
    if (process.env.PERFONEXT_INSTRUMENT !== '1') {
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-scan/lite': join(process.cwd(), 'stubs', 'react-scan-lite.js'),
      };
    }

    // Client compiler only — see apps/baseline/next.config.ts for why.
    if (process.env.ANALYZE === 'true' && !isServer) {
      config.plugins.push(
        new StatsWriterPlugin({
          filename: 'stats.json',
          stats: {
            all: false,
            assets: false,
            modules: true,
            chunks: true,
            chunkModules: true,
            reasons: true,
            // `ids` + the two *Space options are load-bearing. Without them webpack
            // drops chunk ids and collapses the module list, and .next/stats.json
            // parses to nothing with no error.
            ids: true,
            nestedModules: true,
            modulesSpace: Infinity,
            chunkModulesSpace: Infinity,
          },
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
