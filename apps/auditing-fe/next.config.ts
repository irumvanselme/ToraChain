import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // These workspace packages ship raw TS/TSX source, so Next must compile them
  // (node_modules is not transpiled by default).
  transpilePackages: [
    "@tora-chain/fe-common",
    "@tora-chain/ui-components",
    "@tora-chain/dev-configs",
  ],
  // Trace files from the monorepo root so standalone includes workspace
  // packages.  server.js is emitted at apps/auditing-fe/server.js inside
  // the standalone directory.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
