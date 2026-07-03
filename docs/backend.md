# Elections API (Backend)

The elections/voting REST API — **Elysia + Drizzle ORM + Postgres** on Bun.
OpenAPI docs are served at `/docs`.

> **Module documentation:** [`apps/backend/README.md`](../apps/backend/README.md)
> — setup, env vars, scripts, and migrations.

## Responsibilities

- System of record for **elections, candidates, voters (eligibility), and votes**.
- Resolves voter identities against the auth `/core` API.
- Delegates voter **eligibility** to an external HTTP provider per election
  (see [eligibility-api-specs.md](eligibility-api-specs.md)).
- Submits each recorded ballot to the blockchain master (fire-and-forget).

## Module pattern

Each domain under `apps/backend/app/` is a consistent stack:

```
controller.ts   Elysia routes
service.ts      business logic
repository.ts   Drizzle data access
model.ts        table + DTO serializers
schemas.ts      Elysia `t` validators
*.test.ts       co-located tests
```

Modules: `elections/`, `candidates/`, `voters/`, `votes/`, `integrations/`,
`audit/`. Support: `auth/AuthCoreService.ts`, `chain-node/client.ts`, `common/`.
Wired together in `app/app.ts` (`buildServices` / `buildApp`).

## Key facts

| Aspect | Detail |
| ------ | ------ |
| Env | `ELECTIONS_DB_URI` (required), `PORT`, `AUTH_CORE_API_KEY`, `CHAIN_NODE_URL` |
| Migrations | Drizzle (`db:generate` / `db:migrate`), committed to the repo |
| Chain client | `HttpChainNodeClient` when `CHAIN_NODE_URL` set, else `NullChainNodeClient` |
| Data model | [erd.md](erd.md) |

See [architecture.md](architecture.md) for the vote flow.
