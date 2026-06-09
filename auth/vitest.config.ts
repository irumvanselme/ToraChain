import { defineConfig } from "vitest/config";

export default defineConfig({
  // Match the JSX runtime configured in tsconfig.json (@elysia/html).
  esbuild: {
    jsxFactory: "Html.createElement",
    jsxFragment: "Html.Fragment",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Dummy values so config/auth modules can be imported without a real DB.
    env: {
      BETTER_AUTH_SECRET: "test-secret",
      BETTER_AUTH_URL: "http://localhost:3000",
      VOTERS_AUTH_DB_URI: "postgres://test:test@localhost:5432/voters_auth",
      ADMINS_AUTH_DB_URI: "postgres://test:test@localhost:5432/admins_auth",
      AUDITORS_AUTH_DB_URI: "postgres://test:test@localhost:5432/auditors_auth",
    },
  },
});
