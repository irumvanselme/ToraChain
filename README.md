# ToraChain

A blockchain-backed elections/voting system, built as a **Bun monorepo**.

## Workspaces

| Workspace                                                      | Description                                                | Stack                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| [`auth`](./auth/README.md)                                     | Identity & authentication for voters, admins, and auditors | Bun · Elysia · better-auth · Postgres |
| [`backend`](./backend/README.md)                               | Elections/voting REST API                                  | Bun · Elysia · Drizzle ORM · Postgres |
| [`admin-fe`](./admin-fe/README.md)                             | Admin SPA for managing elections                           | React 19 · Vite · Tailwind · DaisyUI  |
| [`packages/be-common`](./packages/be-common/README.md)         | Shared backend library (logging, database, config)         | Bun · pino · Drizzle                  |
| [`packages/ui-components`](./packages/ui-components/README.md) | Shared React component library                             | React 19 · Tailwind · DaisyUI         |

## Services

| #   | Service     | Path                  |
| --- | ----------- | --------------------- |
| 1   | Backend     | http://localhost:8000 |
| 2   | Auth        | http://localhost:8001 |
| 3   | Admin-fe    | http://localhost:3000 |
| 4   | Voting-fe   | http://localhost:3001 |
| 5   | Auditing-fe | http://localhost:3002 |

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- [Docker](https://docs.docker.com/get-docker/) (for databases / the demo stack)
- `make` (optional, for the shortcuts below)

## Quick start (local dev)

```bash
make install                                              # install all deps
docker compose -f iac/dev-data.docker-compose.yaml up -d  # start the databases
make dev                                                  # run auth + backend + admin-fe
```

Then open the admin SPA at **http://localhost:5173**. See each workspace's
README for env vars and migrations. `make help` lists every target.

## Run with Docker Compose (demo)

To try the full stack without installing Bun or running migrations yourself:

```bash
docker compose -f docker-compose.demo.yaml up --build
```

This starts two Postgres databases and the auth, backend, and admin-fe
services, runs migrations automatically, and publishes the app at
**http://localhost:5173** (everything else is reached through it). Register an
admin at `/admins/register`, then sign in. For demos only — secrets are inline
and data is ephemeral.

## CI

`.github/workflows/main.yaml` fans out to per-workspace reusable workflows
(`auth-ci`, `backend-ci`, `admin-fe-ci`) on push/PR to `main`.
