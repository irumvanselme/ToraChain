import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["./**/*.test.ts"],
    // Keep the default logger's transport plain so tests don't spawn the
    // pino-pretty worker thread.
    env: {
      NODE_ENV: "test",
      LOG_PRETTY: "false",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
