import path from "path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const nextConfig = (phase: string): NextConfig => ({
  output: "standalone",
  // These workspace packages ship raw TS/TSX source, so Next must compile them
  // (node_modules is not transpiled by default).
  transpilePackages: [
    "@tora-chain/fe-common",
    "@tora-chain/ui-components",
    "@tora-chain/configs",
  ],
  // Trace files from the monorepo root so standalone includes workspace
  // packages.  server.js is emitted at apps/auditing-fe/server.js inside
  // the standalone directory.
  //
  // Build-only on purpose: in dev this same value becomes Turbopack's project
  // root, and because `next` is installed per-app (there is no hoisted `next`
  // at the monorepo root) Turbopack's HMR writer fails with "Next.js package
  // not found" and tells the browser to reload — on every load, which reads as
  // an infinite reload loop.
  ...(phase === PHASE_DEVELOPMENT_SERVER
    ? {}
    : { outputFileTracingRoot: path.join(__dirname, "../../") }),
});

export default nextConfig;
