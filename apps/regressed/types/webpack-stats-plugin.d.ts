declare module "webpack-stats-plugin" {
  import type { WebpackPluginInstance } from "webpack";

  interface StatsWriterPluginOptions {
    filename?: string;
    stats?: Record<string, unknown>;
    fields?: string[] | null;
    transform?: (data: unknown) => string | Promise<string>;
  }

  export class StatsWriterPlugin implements WebpackPluginInstance {
    constructor(options?: StatsWriterPluginOptions);
    apply(compiler: unknown): void;
  }
}
