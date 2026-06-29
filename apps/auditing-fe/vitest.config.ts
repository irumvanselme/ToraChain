import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["./app/**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_AUTH_BASE: "base",
      NEXT_PUBLIC_API_BASE: "base",
    },
  },
});
