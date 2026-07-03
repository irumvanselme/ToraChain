# torachain-cli (`@tora-chain/cli`)

CLI for running ToraChain blockchain nodes — a per-election, append-only ledger
of vote commitments with a simple **publisher / subscriber** model. Transport is
**Google Cloud Pub/Sub** (the emulator in dev); topic names and payload types
come from [`@tora-chain/specs`](../../packages/specs) — never hardcode a topic
name.

See [docs/blockchain.md](../../docs/blockchain.md) for how the network works.

## Roles

- **Master** (one per network) — Express API (`POST /api/vote`,
  `GET /api/chain`, `GET /api/status`). On each vote it builds the next block,
  persists it, and **publishes** it to the `NEW_BLOCK` topic. Persists to
  Postgres (`CHAIN_DB_URI`), falling back to a local JSON file in dev.
- **Worker** (any number, anywhere) — syncs its chain over HTTP from the
  master, **subscribes** to `NEW_BLOCK` (filtered to one election or `all`),
  re-hashes every block locally and rejects mismatches. A pure subscriber —
  it only receives, never publishes. Stores a pretty-printed
  `chain-worker-<port>.json` (gitignored).

Both roles serve a human-friendly chain viewer at `/`.

## Running

```bash
# from the repo root
make torachain-cli-pubsub-emulator   # local Pub/Sub emulator (required)
make torachain-cli-network           # master (7100) + 3 workers (7101-7103)

# or individually — the ./start script wraps `bun run src/start.ts`
./start --master --port 7100
./start --port 7104 --master-url http://localhost:7100 --election all
```

### Flags

| Flag           | Meaning                                         |
| -------------- | ----------------------------------------------- |
| `--master`     | Run as the master node (default: worker)        |
| `--port`       | HTTP port (default `7100`)                      |
| `--master-url` | Master's base URL — **required for workers**    |
| `--election`   | Election id to follow, or `all` (default `all`) |
| `--db-path`    | Override the JSON block-store path              |

### Environment (`.env.example`)

| Var                              | Meaning                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| `PUBSUB_EMULATOR_HOST`           | Point at the local emulator (e.g. `localhost:8085`)                    |
| `GOOGLE_CLOUD_PROJECT`           | Pub/Sub project id (`torachain-local` with the emulator)               |
| `CHAIN_DB_URI`                   | Master's Postgres; unset → JSON-file fallback (dev only)               |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service-account key for a worker running outside GCP — never commit it |

## Scripts

```bash
bun run dev:master    # watch mode master on 7100
bun run dev:worker    # watch mode worker on 7101
bun run test          # vitest run
bun run check-types   # tsc --noEmit
```

Core chain logic (blocks, hashing) lives in `src/blockchain/`; Pub/Sub wiring in
`src/pubsub/`; node roles in `src/node/`.
