# Elections API (`backend`)

The elections/voting REST API for ToraChain — **Elysia** + **Drizzle ORM** on
Bun, built on [`@tora-chain/be-common`](../packages/be-common/README.md)
(`Database`, `Logger`, `config`).

Resources: **elections**, **candidates**, **voters** (eligibility), and
**votes**. Each lives in `app/<module>/` as a controller → service → repository
stack. Bodies are JSON, ids are UUIDs, timestamps are ISO 8601 UTC, and errors
use `{ code, message, details }`. Voter eligibility is checked against the auth
service's `/core` API.

See [docs/backend.md](../../docs/backend.md) for the full design write-up.

## Stack

Bun · Elysia · Drizzle ORM · `pg` · Zod · OpenAPI (`@elysiajs/openapi`).

## Setup

```bash
cp .env.example .env          # fill ELECTIONS_DB_URI
bun install
bun run db:migrate            # apply Drizzle migrations
bun run dev                   # http://localhost:3001
```

OpenAPI docs are served at `/docs`.

## Environment

Validated at load by `app/env.ts` (Zod). The auth `/core` URL, chain-node base,
and `trustedOrigins` are derived from `@tora-chain/configs`, **not** env vars.

| Var                 | Required | Notes                                                           |
| ------------------- | -------- | --------------------------------------------------------------- |
| `ELECTIONS_DB_URI`  | yes      | Postgres connection string.                                     |
| `PORT`              | no       | Default `3001`; dev `.env` uses `8000`.                         |
| `NODE_ENV`          | no       | `development` vs `production`; selects the configs URL set.     |
| `AUTH_CORE_API_KEY` | no       | Enables voter lookups via the auth `/core` API (else disabled). |
| `CHAIN_NODE_URL`    | no       | Chain master URL; when set, cast votes are forwarded (audit).   |
| `LOG_LEVEL`         | no       | Default `info` (via `@tora-chain/be-common`).                   |
| `LOG_PRETTY`        | no       | Pretty logs; defaults on unless `NODE_ENV=production`.          |

## Scripts

```bash
bun run check-types          # tsc --noEmit
bun run lint                 # eslint .
bun run test                 # vitest run (unit)
bun run test:integration     # vitest against a real database
bun run db:generate          # generate migrations from app/**/model.ts
bun run db:migrate
```
