import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // These workspace packages ship raw TS/TSX source, so Next must compile them
  // (node_modules is not transpiled by default).
  transpilePackages: [
    "@tora-chain/fe-common",
    "@tora-chain/ui-components",
    "@tora-chain/configs",
  ],
  // Required for standalone mode in a Bun monorepo: traces shared packages
  // (e.g. @tora-chain/ui-components) from the repo root, not the workspace dir.
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  turbopack: {
    // Point to the monorepo root so Turbopack doesn't warn about multiple lockfiles.
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
