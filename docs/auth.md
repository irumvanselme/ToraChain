# Auth Service

Identity provider for ToraChain, built on **Elysia + better-auth + Postgres**.

> **Module documentation:** [`apps/auth/README.md`](../apps/auth/README.md) —
> setup, env vars, scripts, and how to add an identity domain.

## Responsibilities

- Serves **three independent identity domains** — `voters`, `admins`, `auditors`
  — each a separate better-auth instance mounted at `/{domain}/api/*`, sharing
  one database via table-name prefixes (`voter_*`, `admin_*`, `auditor_*`).
- Server-rendered sign-in / register / profile pages per domain
  (via `@elysia/html` JSX, **not** React).
- Issues short-lived JWTs at `/{domain}/api/token` (better-auth `jwt`
  plugin); frontends attach them as `Authorization: Bearer` on backend calls,
  and the backend verifies them against each domain's JWKS.
- A `/core` API for the backend and admin app: API-key-gated voter lookups,
  plus admin-session-gated API-key management, user listing/creation, and
  audit-org approval.
- Auditor **organization approval** workflow (auditors add the `organization`
  plugin with approval fields).

## Key facts

| Aspect      | Detail                                                      |
| ----------- | ----------------------------------------------------------- |
| Entry point | `apps/auth/app/server.ts` (`AuthServer` → `AppRegistry`)    |
| Domain enum | `EUserType` in `apps/auth/app/types.ts`                     |
| Env         | `BETTER_AUTH_SECRET`, `AUTH_DB_URI`, `PORT`                 |
| Migrations  | better-auth CLI, one SQL file per domain (`migrate:all`)    |
| Admins      | cannot self-register; bootstrap with `bun run create-admin` |

The multi-domain registry pattern is the core design idea — see the
[architecture doc](architecture.md) and [AGENTS.md](../AGENTS.md) for the full
rationale.
