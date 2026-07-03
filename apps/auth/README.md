# Auth service (`auth`)

Identity & authentication for ToraChain, built on **Elysia** + **better-auth**.

It serves three independent identity domains — `voters`, `admins`, `auditors` —
each with its own better-auth instance mounted under `/{domain}/api/*`, plus
server-rendered sign-in/register/profile pages at `/{domain}/{login,register,…}`.
All domains share one Postgres database; their tables are namespaced by prefix
(`voter_*`, `admin_*`, `auditor_*`). A `/core` API (API-key authenticated) lets
the backend look up voters by id.

See [docs/auth.md](../../docs/auth.md) for the full design write-up.

**Admins cannot self-register.** The admins domain has sign-up disabled (no
`/admins/register` page, and `POST /admins/api/sign-up/email` is rejected).
Admin accounts are created by existing admins from the admin frontend
(`POST /core/api/users/admins`, admin-session gated) — bootstrap the first one
with:

```bash
bun run create-admin -- --name "Jane Doe" --email jane@example.com --password "s3cret-pass"
```

## Stack

Bun · Elysia · better-auth (JWT + OpenAPI plugins) · `pg` · Zod · `@elysia/html`
(JSX server rendering, **not** React).

## Setup

```bash
cp .env.example .env          # fill BETTER_AUTH_SECRET + AUTH_DB_URI
bun install
bun run migrate:all           # apply better-auth + /core schema
bun run dev                   # http://localhost:3000
```

## Environment

Validated at load by `app/env.ts` (Zod). The `baseURL` and `trustedOrigins`
are **not** env vars — they come from `@tora-chain/configs`.

| Var                  | Required | Notes                                                                           |
| -------------------- | -------- | ------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | yes      | Signs sessions/JWTs across all three domains.                                   |
| `AUTH_DB_URI`        | yes      | Shared Postgres connection string (`voter_*` / `admin_*` / `auditor_*` tables). |
| `PORT`               | no       | Default `3000`; dev `.env` uses `8001`.                                         |
| `NODE_ENV`           | no       | `development` vs `production`; selects the configs URL set.                     |
| `LOG_LEVEL`          | no       | Default `info` (via `@tora-chain/be-common`).                                   |
| `LOG_PRETTY`         | no       | Pretty logs; defaults on unless `NODE_ENV=production`.                          |

## Scripts

```bash
bun run check-types          # tsc --noEmit
bun run lint                 # eslint .
bun run test                 # vitest run
bun run format:check
bun run generate:all         # regenerate migrations from auth configs
bun run migrate:all          # apply migrations to the database
bun run health-check
bun run create-admin         # bootstrap an admin account (self-registration is disabled)
```

Adding a domain: add the `EUserType` value, a `*App` class, and register it in
`AuthServer.buildApp()` — the routers pick it up automatically.
