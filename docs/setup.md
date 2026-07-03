# Local Setup

Two ways to run ToraChain locally:

1. **Docker Compose (recommended)** — one command brings up every service,
   the databases, and a working blockchain network. No Bun install required.
2. **Native dev** — run each service with Bun for hot-reload while developing.

> **Browser note:** the apps are served on `*.localhost` subdomains
> (e.g. `admin.localhost:3000`). Chrome and Firefox resolve these
> automatically; Safari does not.

---

## 1. Docker Compose (everything)

[`docker-compose.demo.yaml`](../docker-compose.demo.yaml) builds one shared
image and starts the full stack. Databases are migrated automatically and a
demo admin account is created on boot.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2

### Run

```bash
docker compose -f docker-compose.demo.yaml up --build
```

This starts:

| Container          | Role                                              | URL                            |
| ------------------ | ------------------------------------------------- | ------------------------------ |
| `admin-fe`         | Admin app (manage elections)                      | http://admin.localhost:3000    |
| `voting-fe`        | Voter app (enroll & cast a ballot)                | http://voting.localhost:3001   |
| `auditing-fe`      | Auditor app (verify results)                      | http://auditing.localhost:3002 |
| `auth`             | Identity provider (migrated on boot)              | http://idp.localhost:8001      |
| `backend`          | Elections API (migrated on boot; OpenAPI `/docs`) | http://api.localhost:8000      |
| `example-voters`   | Example external eligibility provider (seeded)    | http://localhost:3003          |
| `chain-master`     | Blockchain master node + chain viewer             | http://localhost:7100          |
| `chain-worker-1…3` | Blockchain validator nodes (pBFT quorum)          | http://localhost:7101–7103     |
| `auth-db`          | Postgres for the auth service                     | internal                       |
| `elections-db`     | Postgres for the elections API                    | internal                       |
| `pubsub-emulator`  | Google Cloud Pub/Sub emulator (chain transport)   | internal                       |

The host ports match the development URLs defined in
[`packages/configs/src/links.ts`](../packages/configs/src/links.ts) — the
single source of truth for service URLs (they are **not** env vars).

### First steps

1. Open **http://admin.localhost:3000** and sign in with the **Default login**
   button (`admin@localhost.dev` / `Pa$$w0rd!` — created automatically).
   Admins cannot self-register; more admins can be added from the admin app.
2. Create an election and add candidates.
3. (Optional) Configure the election's **eligibility integration** to use the
   bundled example provider: URL `http://example-voters:3003/api/verify`,
   method `POST`, API-key header `x-api-key: test-api-key-dev-only`, and form
   fields `email` + `national-id` (plus a `fingerprint` or `eyes` field). The
   provider is pre-seeded with voters like `alice@example.com` /
   `NID-001-ALICE` — see http://localhost:3003 for the full list.
4. Open **http://voting.localhost:3001**, register as a voter, enroll, and
   cast a ballot. Watch the block land at **http://localhost:7100**.

### Tear down

```bash
docker compose -f docker-compose.demo.yaml down -v   # -v also removes DB volumes
```

> **Demo only.** Secrets are inline and all data is ephemeral — do not use
> this stack in production.

---

## 2. Native development (hot-reload)

For active development, run services directly with Bun.

### Prerequisites

- [Bun](https://bun.sh) 1.x
- Docker (for local Postgres and the Pub/Sub emulator) — or reachable
  equivalents

### Steps

```bash
bun install          # install all workspace dependencies

# 1. Start two local Postgres databases (any Postgres works; these match the
#    .env.example defaults)
docker run -d --name tora-auth-db      -p 5432:5432 \
  -e POSTGRES_USER=auth -e POSTGRES_PASSWORD=auth -e POSTGRES_DB=auth postgres:17-alpine
docker run -d --name tora-elections-db -p 5433:5432 \
  -e POSTGRES_USER=elections -e POSTGRES_PASSWORD=elections -e POSTGRES_DB=elections postgres:17-alpine

# 2. Configure each app's env
cp apps/auth/.env.example    apps/auth/.env      # set BETTER_AUTH_SECRET + AUTH_DB_URI
cp apps/backend/.env.example apps/backend/.env   # set ELECTIONS_DB_URI

# 3. Apply migrations
cd apps/auth    && bun run migrate:all && cd -
cd apps/backend && bun run db:migrate  && cd -

# 4. Bootstrap the first admin (self-registration is disabled for admins;
#    using the dev credentials makes the "Default login" button work)
cd apps/auth && bun run create-admin -- \
  --name "Admin User" --email admin@localhost.dev --password 'Pa$$w0rd!' && cd -

# 5. Start the Pub/Sub emulator (needed by the chain nodes; requires gcloud)
make torachain-cli-pubsub-emulator
# …or without gcloud installed:
#   docker run -d -p 8085:8085 gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators \
#     gcloud beta emulators pubsub start --project=torachain-local --host-port=0.0.0.0:8085

# 6. Run everything (backend, auth, 3 frontends, example provider,
#    chain master + 3 workers)
make dev
```

`make help` lists every target. Individual services: `make backend-dev`,
`make auth-dev`, `make admin-fe-dev`, etc.

To have votes recorded on the blockchain, set
`CHAIN_NODE_URL=http://localhost:7100` in `apps/backend/.env` (without it the
backend uses a no-op chain client — everything else still works).

### Blockchain network only

```bash
make torachain-cli-network   # master (7100) + 3 workers (7101-7103)
```

The chain nodes require the Pub/Sub emulator from step 5 above
(`PUBSUB_EMULATOR_HOST`, see
[`apps/torachain-cli/.env.example`](../apps/torachain-cli/.env.example)) —
unlike the master's Postgres (which falls back to a JSON file), Pub/Sub has
no local fallback.

### Ports (dev)

| Service                 | URL                            |
| ----------------------- | ------------------------------ |
| Elections API           | http://api.localhost:8000      |
| Auth / IdP              | http://idp.localhost:8001      |
| Admin app               | http://admin.localhost:3000    |
| Voting app              | http://voting.localhost:3001   |
| Auditing app            | http://auditing.localhost:3002 |
| Example voters provider | http://localhost:3003          |
| Chain master            | http://localhost:7100          |
| Chain workers           | http://localhost:7101–710n     |
| Pub/Sub emulator        | localhost:8085                 |

---

## Verify it works

- Auth health: `GET http://idp.localhost:8001/health`
- API docs (OpenAPI): http://api.localhost:8000/docs
- Chain viewer: http://localhost:7100 (chain status: `GET /api/status`)

Run the test suites with `make test` (or `make ci` for the full local gate:
format → types → lint → test).
