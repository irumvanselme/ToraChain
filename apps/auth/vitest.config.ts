import { defineConfig } from "vitest/config";

export default defineConfig({
  // Match the JSX runtime configured in tsconfig.json (@elysia/html).
  esbuild: {
    jsxFactory: "Html.createElement",
    jsxFragment: "Html.Fragment",
  },
  test: {
    environment: "node",
    include: ["./**/*.test.{ts,tsx}"],
    // Dummy values so config/auth modules can be imported without a real DB.
    env: {
      NODE_ENV: "development",
      BETTER_AUTH_SECRET: "test-secret",
      AUTH_DB_URI: "postgres://test:test@localhost:5432/tora_auth",
    },
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}"],
      exclude: [
        "app/**/*.test.{ts,tsx}",
        // The HTTP bootstrap constructs the server and binds a port at import
        // time; it is exercised end-to-end at runtime, not in unit tests.
        "app/server.ts",
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
