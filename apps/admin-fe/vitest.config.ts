import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^api\//, replacement: `${src}/api/` },
      { find: /^lib\//, replacement: `${src}/lib/` },
      { find: /^components\//, replacement: `${src}/components/` },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["./src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    env: {},
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/test/**",
      ],
      reporter: ["text", "json-summary"],
    },
  },
});
