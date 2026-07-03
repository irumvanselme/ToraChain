# Frontends

Three role-specific apps, all consuming the shared packages
[`@tora-chain/configs`](../packages/configs/README.md),
[`@tora-chain/fe-common`](../packages/fe-common),
and [`@tora-chain/ui-components`](../packages/ui-components/README.md).

| App | Role | Stack | Module docs |
| --- | ---- | ----- | ----------- |
| **admin-fe** | Admins manage elections (CRUD) | React 19 + Vite + Tailwind/DaisyUI | [`apps/admin-fe/README.md`](../apps/admin-fe/README.md) |
| **voting-fe** | Voters enroll & cast ballots | Next.js App Router + React 19 | [`apps/voting-fe/README.md`](../apps/voting-fe/README.md) |
| **auditing-fe** | Auditors verify results | Next.js App Router + React 19 | [`apps/auditing-fe/README.md`](../apps/auditing-fe/README.md) |

## Common patterns

- **API access** — hand-written `fetch` wrappers in each app's `api/` directory
  (a `request.ts` with `credentials: "include"` + per-resource modules). No
  generated clients, no better-auth client SDK.
- **Auth state** — `fe-common`'s `AuthProvider` / `RequireAuth` hit
  `{AUTH_BASE}/api/get-session` directly.
- **Same-origin** — admin-fe proxies `/admins/*` → auth and `/api/*` → backend
  so the session cookie works; production puts them behind one gateway.
- **auditing-fe exception** — exchanges its session cookie for a short-lived JWT
  (`app/api/token.ts` → better-auth `/token`) and sends `Authorization: Bearer`
  to the backend audit endpoints.

## URLs

Service URLs come from [`packages/configs/src/links.ts`](../packages/configs/src/links.ts),
resolved to `development` vs `demo` by `getEnv()`. See the
[README service table](../README.md#deployed-services).
