import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["./app/**/*.test.ts"],
    env: {
      // Dummy values so config/env modules import without a real database.
      ELECTIONS_DB_URI: "postgres://test:test@localhost:5432/elections_test",
      AUTH_SERVICE_URL: "http://localhost:8001",
      PORT: "8000",
    },
  },
});
