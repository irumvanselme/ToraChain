import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Targets for the dev proxy. Override via env when the services run elsewhere.
const AUTH_TARGET = process.env.AUTH_TARGET ?? "http://localhost:3000";
const API_TARGET = process.env.API_TARGET ?? "http://localhost:3001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Auth service: the server-rendered admin sign-in pages live under
      // `/admins/{login,register,...}` and the better-auth API under
      // `/admins/api/*`. Proxying keeps them same-origin with the SPA so the
      // session cookie (SameSite=Lax) is sent on `get-session` fetches.
      "/admins": { target: AUTH_TARGET, changeOrigin: true },
      // Elections backend, mounted under `/api` and rewritten to its real
      // paths (`/api/elections` -> `/elections`). A distinct prefix avoids
      // clobbering the SPA's own `/elections` route.
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
