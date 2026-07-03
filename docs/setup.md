# Local Setup

Two ways to run ToraChain locally:

1. **Docker Compose (recommended)** — one command brings up the apps *and* their
   databases. No Bun install required.
2. **Native dev** — run each service with Bun for hot-reload while developing.

---

## 1. Docker Compose (all apps + databases)

The [`docker-compose.demo.yaml`](../docker-compose.demo.yaml) stack builds the
images, starts **two Postgres databases**, runs migrations automatically, and
serves everything same-origin through the admin app.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2

### Run

```bash
docker compose -f docker-compose.demo.yaml up --build
```

This starts:

| Container | Role | Exposed |
| --------- | ---- | ------- |
| `auth-db` | Postgres for the auth service | internal |
| `elections-db` | Postgres for the elections API | internal |
| `auth` | Identity provider (migrations run on boot) | via `:5173` |
| `backend` | Elections API (migrations run on boot) | via `:5173` |
| `admin-fe` | Admin SPA + proxy to auth & backend | **http://localhost:5173** |

### First steps

1. Open **http://localhost:5173**.
2. Register an admin at **`/admins/register`**, then sign in.
3. Create an election, add candidates, and manage voters.

> The admin app proxies `/admins/*` → auth and `/api/*` → backend so the
> better-auth session cookie stays same-origin. Only port `5173` is published.

### Tear down

```bash
docker compose -f docker-compose.demo.yaml down -v   # -v also removes DB volumes
```

> **Demo only.** Secrets are inline and database data is ephemeral — do not use
> this stack in production.

---

## 2. Native development (hot-reload)

For active development, run services directly with Bun.

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- Docker (for local Postgres) — or a reachable Postgres connection string

### Steps

```bash
bun install          # install all workspace dependencies

# provide DB connection strings via each app's .env
cp apps/auth/.env.example    apps/auth/.env      # set AUTH_DB_URI + BETTER_AUTH_SECRET
cp apps/backend/.env.example apps/backend/.env   # set ELECTIONS_DB_URI + AUTH_SERVICE_URL

# apply migrations
cd apps/auth    && bun run migrate:all && cd -
cd apps/backend && bun run db:migrate  && cd -

# run everything (backend, auth, 3 frontends, chain master + workers)
make dev
```

`make help` lists every target. Individual services: `make backend-dev`,
`make auth-dev`, `make admin-fe-dev`, etc.

### Blockchain network (optional)

```bash
make torachain-cli-network   # master (7100) + 3 workers (7101-7103)
```

The chain uses the Google Cloud Pub/Sub **emulator** locally:

```bash
cd iac && make torachain-cli-pubsub-emulator   # sets PUBSUB_EMULATOR_HOST
```

Point the backend at the master by setting `CHAIN_NODE_URL=http://localhost:7100`
in `apps/backend/.env`.

### Ports (dev)

| Service | URL |
| ------- | --- |
| Backend / Elections API | http://api.localhost:8000 |
| Auth / IdP | http://idp.localhost:8001 |
| Admin app | http://admin.localhost:3000 |
| Voting app | http://voting.localhost:3001 |
| Auditing app | http://auditing.localhost:3002 |
| Example voters DB | http://localhost:3003 |
| Chain master | http://localhost:7100 |

Service URLs come from [`packages/configs`](../packages/configs/README.md), not
env vars — change [`links.ts`](../packages/configs/src/links.ts) to move a URL.

---

## Verify it works

- Auth health: `GET http://idp.localhost:8001/health`
- API docs (OpenAPI): http://api.localhost:8000/docs
- Chain viewer: http://localhost:7100

Run the test suites with `make test` (or `make ci` for the full local gate:
format → types → lint → test).
