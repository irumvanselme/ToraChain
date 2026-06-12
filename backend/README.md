# Elections API (`backend`)

The elections/voting REST API for ToraChain — **Elysia** + **Drizzle ORM** on
Bun, built on [`@tora-chain/be-common`](../packages/be-common/README.md)
(`Database`, `Logger`, `config`).

Resources: **elections**, **candidates**, **voters** (eligibility), and
**votes**. Each lives in `app/<module>/` as a controller → service → repository
stack. Bodies are JSON, ids are UUIDs, timestamps are ISO 8601 UTC, and errors
use `{ code, message, details }`. Voter eligibility is checked against the auth
service's `/core` API.

## Stack

Bun · Elysia · Drizzle ORM · `pg` · Zod · OpenAPI (`@elysiajs/openapi`).

## Setup

```bash
cp .env.example .env          # fill ELECTIONS_DB_URI + AUTH_SERVICE_URL
bun install
bun run db:migrate            # apply Drizzle migrations
bun run dev                   # http://localhost:3001
```

OpenAPI docs are served at `/docs`.

## Environment

| Var                                   | Required | Notes                                            |
| ------------------------------------- | -------- | ------------------------------------------------ |
| `ELECTIONS_DB_URI`                    | yes      | Postgres connection string.                      |
| `AUTH_SERVICE_URL`                    | yes      | Auth service base URL.                           |
| `PORT`                                | no       | Default `3001`.                                  |
| `TRUSTED_ORIGINS`                     | no       | Comma-separated; defaults to `AUTH_SERVICE_URL`. |
| `AUTH_CORE_URL` / `AUTH_CORE_API_KEY` | no       | Enable voter lookups via the `/core` API.        |

## Scripts

```bash
bun run check-types          # tsc --noEmit
bun run lint                 # eslint .
bun run test                 # vitest run (unit)
bun run test:integration     # vitest against a real database
bun run db:generate          # generate migrations from app/**/model.ts
bun run db:migrate
```
