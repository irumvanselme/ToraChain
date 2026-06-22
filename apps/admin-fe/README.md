# admin-fe

Admin SPA for ToraChain — React 19 + Vite, styled with Tailwind CSS v4 +
DaisyUI, built from the shared `@tora-chain/ui-components` library. Admins sign
in against the **admins** identity domain of the auth service and manage
elections (CRUD) through the elections backend API.

## Running locally

The SPA talks to two backend services and relies on the better-auth session
cookie (`SameSite=Lax`), so everything must be **same-origin**. The Vite dev
server proxies both services to satisfy this (see `vite.config.ts`):

| Path in the SPA | Proxied to          | Purpose                                         |
| --------------- | ------------------- | ----------------------------------------------- |
| `/admins/*`     | auth (`:3000`)      | sign-in pages + better-auth API                 |
| `/api/*`        | elections (`:3001`) | elections API (`/api/elections` → `/elections`) |

Start the backends, then the SPA:

```bash
# auth service (serves /admins/login, /admins/api/*)
cd auth && bun run dev

# elections backend (serves /elections, …)
cd backend && bun run dev

# admin SPA (http://localhost:5173)
cd admin-fe && bun run dev
```

Override the proxy targets with `AUTH_TARGET` / `API_TARGET` env vars if the
services run elsewhere.

## Auth flow

1. Every route under `/` is wrapped in `RequireAuth`, which checks the session
   via `GET /admins/api/get-session`.
2. With no session, the browser is sent to the server-rendered sign-in page at
   `/admins/login?redirect=<current-path>`.
3. On success the auth page redirects back to `<current-path>` (the auth
   `WebRouter` only honors same-origin, absolute-path redirects), the session
   cookie is set, and the SPA renders.
4. "Sign out" calls `POST /admins/api/sign-out` and returns to the login page.

## Scripts

```bash
bun run dev          # Vite dev server (with proxy)
bun run build        # tsc -b && vite build
bun run check-types  # tsc -b
bun run lint         # eslint .
bun run preview      # preview the production build
```

## Production

Serve the SPA, auth service, and elections API behind a single gateway so they
share an origin. Override the API bases with `VITE_AUTH_BASE` / `VITE_API_BASE`
if the gateway paths differ from the dev defaults (`/admins`, `/api`).
