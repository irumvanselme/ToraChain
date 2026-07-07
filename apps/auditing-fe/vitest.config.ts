import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [{ find: /^@\//, replacement: root }],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/test/setup.ts"],
    include: ["./app/**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_AUTH_BASE: "base",
      NEXT_PUBLIC_API_BASE: "base",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["app/**/*.{ts,tsx}"],
      exclude: [
        "app/**/*.test.{ts,tsx}",
        "app/test/**",
        "app/layout.tsx",
        "app/globals.css",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
