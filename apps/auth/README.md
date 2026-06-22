# Auth service (`auth`)

Identity & authentication for ToraChain, built on **Elysia** + **better-auth**.

It serves three independent identity domains — `voters`, `admins`, `auditors` —
each with its own better-auth instance mounted under `/{domain}/api/*`, plus
server-rendered sign-in/register/profile pages at `/{domain}/{login,register,…}`.
All domains share one Postgres database; their tables are namespaced by prefix
(`voter_*`, `admin_*`, `auditor_*`). A `/core` API (API-key authenticated) lets
the backend look up voters by id.

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

| Var                  | Required | Notes                                           |
| -------------------- | -------- | ----------------------------------------------- |
| `BETTER_AUTH_SECRET` | yes      | Signs sessions/JWTs.                            |
| `BETTER_AUTH_URL`    | yes      | Public base URL.                                |
| `AUTH_DB_URI`        | yes      | Shared Postgres connection string.              |
| `PORT`               | no       | Default `3000`.                                 |
| `TRUSTED_ORIGINS`    | no       | Comma-separated; defaults to `BETTER_AUTH_URL`. |

## Scripts

```bash
bun run check-types          # tsc --noEmit
bun run lint                 # eslint .
bun run test                 # vitest run
bun run format:check
bun run generate:all         # regenerate migrations from auth configs
bun run migrate:all          # apply migrations to the database
bun run health-check
```

Adding a domain: add the `EUserType` value, a `*App` class, and register it in
`AuthServer.buildApp()` — the routers pick it up automatically.
