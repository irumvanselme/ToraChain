import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@tora-chain/fe-common` ships raw TS/TSX source, so Next must compile it
  // (node_modules is not transpiled by default).
  transpilePackages: ["@tora-chain/fe-common"],
};

export default nextConfig;
