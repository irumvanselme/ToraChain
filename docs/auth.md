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
- A `/core` API (API-key authenticated) so the backend can resolve voter
  identities and manage users.
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
