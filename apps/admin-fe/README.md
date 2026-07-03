# admin-fe

Admin SPA for ToraChain — React 19 + Vite, styled with Tailwind CSS v4 +
DaisyUI, built from the shared `@tora-chain/ui-components` library. Admins sign
in against the **admins** identity domain of the auth service and manage
elections (CRUD) through the elections backend API.

See [docs/frontends.md](../../docs/frontends.md) for the shared frontend patterns.

## Running locally

Service URLs are **not** configured here — they come from
`@tora-chain/configs` (`packages/configs/src/links.ts`), which resolves
`development` vs `demo` from `NODE_ENV`/`VITE_NODE_ENV`. In dev the SPA talks to
the backends cross-origin via their `*.localhost` subdomains, so the auth
cookies are `SameSite=None; Secure` (set by the auth service):

| Base (`lib/config.ts`) | Resolves to (dev)                | Purpose                          |
| ---------------------- | -------------------------------- | -------------------------------- |
| `AUTH_BASE`            | `http://idp.localhost:8001/admins` | sign-in pages + better-auth API  |
| `CORE_API`             | `http://idp.localhost:8001/core/api` | admin/user + audit-org lookups   |
| `API_BASE`             | `http://api.localhost:8000`      | elections API (`/elections`, …)  |

The SPA itself is served at `http://admin.localhost:3000` (the `dev` script
passes `--port 3000`).

Start the backends, then the SPA:

```bash
# auth service (serves /admins/login, /admins/api/*, /core/api/*)
cd apps/auth && bun run dev

# elections backend (serves /elections, …)
cd apps/backend && bun run dev

# admin SPA (http://admin.localhost:3000)
cd apps/admin-fe && bun run dev
```

To change a service URL, edit `packages/configs/src/links.ts` — not an env var.

## Auth flow

1. Every route under `/` is wrapped in `RequireAuth`, which checks the session
   via `GET {AUTH_BASE}/api/get-session`.
2. With no session, the browser is sent to the server-rendered sign-in page at
   `{AUTH_BASE}/login?redirect=<current-path>` (see `loginUrl` in
   `lib/config.ts`).
3. On success the auth page redirects back to `<current-path>` (the auth
   `WebRouter` only honors same-origin, absolute-path redirects), the session
   cookie is set, and the SPA renders.
4. "Sign out" calls `POST {AUTH_BASE}/api/sign-out` and returns to the login
   page.

Backend (elections API) requests carry an **admin JWT**, not just the cookie:
`api/request.ts` uses `@tora-chain/fe-common`'s token manager to exchange the
admin session cookie at `{AUTH_BASE}/api/token`, caches the token, and
refreshes/retries on 401. Auth `/core` endpoints ignore the extra Bearer header
and keep using the cookie.

## Scripts

```bash
bun run dev          # Vite dev server on port 3000
bun run build        # tsc -b && vite build
bun run check-types  # tsc -b
bun run lint         # eslint .
bun run preview      # preview the production build
bun run test         # vitest (single run)
```

## Production

URLs come from `@tora-chain/configs` in `demo` mode (`NODE_ENV=production` maps
to `demo`), which points at the deployed `*.tora-chain-demo.iansel.me` hosts.
Adjust `links.ts` to retarget a different deployment.
