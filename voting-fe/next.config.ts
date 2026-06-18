import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These workspace packages ship raw TS/TSX source, so Next must compile them
  // (node_modules is not transpiled by default).
  transpilePackages: [
    "@tora-chain/fe-common",
    "@tora-chain/ui-components",
    "@tora-chain/dev-configs",
  ],
};

export default nextConfig;
