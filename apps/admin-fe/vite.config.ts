import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Service URLs are resolved at runtime from `@tora-chain/configs` (see
// `src/lib/config.ts`); the SPA talks to auth/backend cross-origin via their
// `*.localhost` subdomains, so no dev proxy is needed. The dev port is set by
// the `dev` script (`vite --port 3000`) to match `admin.localhost:3000`.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
});
