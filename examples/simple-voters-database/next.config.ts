import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Point to the monorepo root so Turbopack doesn't warn about multiple lockfiles.
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
