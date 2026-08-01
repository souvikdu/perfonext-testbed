import type { NextConfig } from "next";
import { join } from "node:path";
import { StatsWriterPlugin } from "webpack-stats-plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@testbed/ui", "@testbed/data"],
  // Keeps the compute package out of the server bundle so CPU-profile frames point
  // at real, unbundled source lines.
  serverExternalPackages: ["@testbed/compute"],
  experimental: {
    // BASELINE ONLY. apps/regressed omits this, which is the B4 barrel-import defect.
    // react-feather is used rather than a popular icon pack because Next ships its own
    // default optimizePackageImports list (lucide-react, @tabler/icons-react, ...) that
    // would silently fix the defect on both sides.
    optimizePackageImports: ["react-feather"],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack(config, { isServer }) {
    if (!isServer && process.env.PERFONEXT_INSTRUMENT === "1") {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = typeof originalEntry === "function" ? await originalEntry() : originalEntry;
        const mainApp = entries["main-app"];
        const imports = Array.isArray(mainApp) ? mainApp : mainApp.import;
        const instrument = join(process.cwd(), "src", "app", "ReactScanInstrument.tsx");

        if (!imports.includes(instrument)) {
          imports.unshift(instrument);
        }
        return entries;
      };
    }

    // react-scan is a static import in ReactScanInstrument so that instrument() runs
    // before hydration. Only the render lane wants it in the bundle; leaving it in for
    // the build lane would measure the profiler instead of the app.
    if (process.env.PERFONEXT_INSTRUMENT !== "1") {
      config.resolve.alias = {
        ...config.resolve.alias,
        "react-scan/lite": join(process.cwd(), "stubs", "react-scan-lite.js"),
      };
    }

    // Client compiler only. All three compilers (client/server/edge) write to the same
    // filename, so an ungated plugin produces whichever stats finished last — that is
    // how a 14 MB graph silently becomes a 30 KB one.
    if (process.env.ANALYZE === "true" && !isServer) {
      config.plugins.push(
        new StatsWriterPlugin({
          filename: "stats.json",
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
