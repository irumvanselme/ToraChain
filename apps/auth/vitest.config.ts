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
  },
});
