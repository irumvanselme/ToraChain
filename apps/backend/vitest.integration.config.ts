import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["./tests/integration/**/*.test.ts"],

    // Integration tests share one database; run them serially.
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "development",
      LOG_LEVEL: "error",
    },
  },
});
