# Testing guidelines & strategy

How ToraChain is tested, why it is tested that way, and how to write and run
tests when contributing. For a one-page summary see the
[Testing strategy](../README.md#testing-strategy) section of the README.

## The test pyramid

An elections system has one non-negotiable requirement: **a vote recorded must
be the vote cast, exactly once, and verifiably so**. The testing strategy is
shaped around that guarantee, layered as a pyramid:

| Layer                        | What it proves                                                     | Runner                                    | Count (2026-07-07)           |
| ---------------------------- | ------------------------------------------------------------------ | ----------------------------------------- | ---------------------------- |
| **Unit tests**               | Each module behaves correctly in isolation, incl. edge cases       | Vitest (co-located `*.test.ts(x)`)        | **851** across 11 workspaces |
| **Integration tests**        | The backend HTTP API + real Postgres behave correctly end to end   | Vitest (`apps/backend/tests/integration`) | **14**                       |
| **Manual acceptance script** | The full multi-actor election lifecycle works on the deployed demo | Human, against the demo stack             | 7-stage script               |
| **E2E tests** _(planned)_    | The browser flows work against the full Docker stack               | Playwright _(not yet implemented)_        | —                            |

Everything automated runs on **Vitest** — one runner, one mental model, in
every app and package. Frontends and component libraries add
**jsdom + React Testing Library**; coverage is collected with the **v8**
provider.

## Unit tests

Unit tests live **next to the code they test** (`service.ts` →
`service.test.ts`). Every workspace has them — the three backend apps, all
three frontends, and all five shared packages.

### Strategies in use

- **Dependency injection + in-memory fakes, not mocks.** The backend's
  layered modules (`controller → service → repository`) accept their
  dependencies in constructors, so tests swap Drizzle repositories for
  in-memory fakes (`apps/backend/app/test-helpers/fakes.ts`). Controller
  tests exercise the _real_ Elysia HTTP pipeline (routing, validation,
  error handler) via `app.handle(new Request(...))` — only the database is
  faked.
- **Deterministic time.** Services that depend on the clock take a `now()`
  function (e.g. `VotesService` is constructed with
  `() => new Date("2026-06-09T12:00:00Z")` in tests), so election
  open/close-window edge cases are testable to the millisecond.
- **Varied inputs via `test.each`.** Property-style tables cover different
  input shapes — the chain hashing suite hashes a string, a number, an
  object, a `bigint`, and **one megabyte of data** in a single table
  (`apps/torachain-cli/src/blockchain/hashing.test.ts`).
- **Snapshot tests for cryptographic stability.** Block hashes are
  snapshotted; an accidental change to the hashing algorithm — which would
  desynchronise master and worker nodes — fails the suite immediately.
- **Negative-path and edge-case coverage.** Casting a second ballot must
  return `409 ALREADY_VOTED`; voting on a non-active election must be
  rejected; a tampered block must fail re-hashing; unauthenticated requests
  must bounce off the `protect(...)` guard. The unhappy paths are tested as
  deliberately as the happy ones.
- **Isolated env for config modules.** `vitest.config.ts` in auth/backend
  injects dummy `*_DB_URI`/secret env vars, so Zod-validated env modules
  import cleanly without a real database.
- **Component tests in jsdom.** Frontend suites render real components with
  Testing Library, stub `fetch` at the boundary, and assert on what the user
  sees (roles, text, form behaviour) rather than implementation details.

### Writing a new unit test

1. Co-locate it: `foo.ts` → `foo.test.ts` in the same directory.
2. Structure with **GIVEN / WHEN / THEN** comments (see
   `hashing.test.ts` for the house style).
3. Prefer the shared fakes in `app/test-helpers/` over ad-hoc `vi.mock` —
   fakes keep tests readable and survive refactors.
4. Cover at least one failure path for every success path.
5. Keep it fast and hermetic: no network, no real database, no wall-clock
   dependence.

## Integration tests (backend)

Unit tests can't catch what only a real database will: SQL/schema drift,
constraint violations, transaction semantics, cascade behaviour. The backend
therefore has a second suite in `apps/backend/tests/integration/`, run by a
separate config (`vitest.integration.config.ts`).

- **Real Postgres**, pointed at by `VITE_TEST_DATABASE_URI` (a dedicated
  `elections_db_integration_test` database — never the dev or demo DB).
- **Clean slate per run**: `tests/integration/setup.ts` drops the `public`
  and `drizzle` schemas, re-applies every committed Drizzle migration, and
  truncates all tables between tests — so the suite also verifies that the
  migrations themselves build a working schema from zero.
- **Serial execution** (`fileParallelism: false`) because the tests share
  one database.
- **Full-stack HTTP**: tests drive the same Elysia app a client would,
  seeding elections/candidates/voters through the public API and asserting
  end-to-end flows — enroll → cast → reject duplicate → close election →
  read tallies.

```bash
cd apps/backend
bun run test:integration
```

If `VITE_TEST_DATABASE_URI` is unset the suite skips gracefully; in CI it is
provided as a repository secret and runs as its own job.

## End-to-end tests (planned)

Browser-level E2E is the next layer. The plan:

- **Playwright** driving Chromium/Firefox/WebKit against the full
  `docker-compose.demo.yaml` stack (both databases, Pub/Sub emulator, all
  services, 4 chain nodes) — the same stack anyone can boot with one command,
  so E2E runs are reproducible on any machine and in CI.
- The scenarios are already written: the **manual acceptance script** below
  is the E2E backlog. Each stage becomes a spec, sharing storage-state
  fixtures per actor (admin / voter / auditor).
- Add an `e2e` job to `.github/workflows/main.yaml` that boots the compose
  stack and runs the suite headless on Ubuntu.

Until then the script is executed by hand against the demo deployment before
each release:

### Manual acceptance script

1. **Admin** — log in → create a second admin → log in as them → create an
   election → configure the eligibility integration (national ID +
   fingerprint form fields) → mark voters eligible.
2. **Auditor** — register → submit the organisation application → wait for
   approval.
3. **Admin** — approve the auditor; add a new node to the blockchain
   network and watch it sync.
4. **Voter** — log in → check eligibility → enroll → once the election
   opens, cast a ballot → see the vote land on the chain viewer.
5. **Admin** — end the election and release results.
6. **Voter** — verify their own vote and view results.
7. **Auditor** — view results and download/verify the chain.

## Environments

The same suites run across several hardware/software environments, which has
already surfaced environment-specific issues (path casing, port collisions,
cookie behaviour on `*.localhost` subdomains):

| Environment                              | What runs                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer laptops (macOS, Apple Silicon) | full unit suites via `make test`, watch mode during development                                                                                      |
| GitHub Actions (Ubuntu, x86_64)          | every push, any branch: per-workspace `format:check → check-types → lint → test` (+ `build` for frontends), backend integration job against Postgres |
| Docker demo stack (Linux containers)     | manual acceptance script against the complete system, incl. the Pub/Sub emulator and a 4-node chain                                                  |
| GCP Cloud Run (demo deployment)          | post-deploy manual verification of the live URLs                                                                                                     |

## Running the tests

| Command                                   | Scope                                                      |
| ----------------------------------------- | ---------------------------------------------------------- |
| `make test`                               | backend (unit + integration) + auth + chain CLI            |
| `make ci`                                 | full local CI gate: format → types → lint → test           |
| `bun run test` (in any workspace)         | that workspace's unit suite                                |
| `bun run test:watch`                      | watch mode (auth/backend)                                  |
| `bunx vitest run path/to/file.test.ts`    | a single file                                              |
| `bunx vitest run -t "name substring"`     | tests matching a name                                      |
| `bun run test:integration` (apps/backend) | backend integration suite (needs `VITE_TEST_DATABASE_URI`) |

## Results & analysis (as of 2026-07-07)

All suites green, locally and in CI:

| Workspace                    | Files   | Tests   | Result |
| ---------------------------- | ------- | ------- | ------ |
| `apps/auth`                  | 15      | 101     | pass   |
| `apps/backend` (unit)        | 18      | 131     | pass   |
| `apps/backend` (integration) | 4       | 14      | pass   |
| `apps/torachain-cli`         | 3       | 31      | pass   |
| `apps/admin-fe`              | 23      | 232     | pass   |
| `apps/auditing-fe`           | 12      | 72      | pass   |
| `apps/voting-fe`             | 1       | 1       | pass   |
| `packages/configs`           | 7       | 25      | pass   |
| `packages/be-common`         | 4       | 58      | pass   |
| `packages/fe-common`         | 6       | 53      | pass   |
| `packages/ui-components`     | 21      | 136     | pass   |
| `packages/specs`             | 1       | 11      | pass   |
| **Total**                    | **115** | **865** | pass   |

The distribution mirrors the project's risk profile: the deepest suites sit on
the vote-integrity path (backend 145 tests, auth 101, chain hashing/blocks 31)
and on the admin surface where elections are configured (admin-fe 232).
`voting-fe` is the known thin spot (1 test) and is the priority for the next
testing iteration alongside E2E.

### How the tests help us find and fix problems

- **Failures localise the bug by layer.** Because controller, service, and
  repository each have their own suite, a red test names the layer at fault —
  a `409` missing at the controller with a green service test means the
  route wiring broke, not the business rule.
- **Regressions are blocked at the door.** CI runs the full gate on every
  push to every branch; `main` cannot advance (and therefore cannot deploy —
  `deploy.yaml` runs after CI on `main`) with a failing suite.
- **The integration suite validates the migrations themselves.** Rebuilding
  the schema from zero on every run means a broken or missing migration
  fails loudly in CI long before it reaches a deployment.
- **Snapshots guard cross-node consensus.** Any change to block hashing
  breaks a snapshot, which is exactly the failure mode that would otherwise
  only appear as workers silently rejecting the master's blocks.
- **Behaviour-first assertions keep refactors safe.** Tests assert on HTTP
  responses and rendered output, so internal refactors (e.g. swapping a
  repository implementation) pass untouched while genuine behaviour changes
  fail visibly.
