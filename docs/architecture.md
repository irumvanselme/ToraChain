# System Architecture

ToraChain separates **identity**, **election data**, and **vote integrity** into
independent services so each can be scaled, deployed, and audited on its own.

- **Auth service** — the single identity provider for three user domains.
- **Elections API** — the system of record for elections, candidates, and ballots.
- **Blockchain network** — an append-only, independently verifiable ledger of votes.
- **Frontends** — role-specific apps for admins, voters, and auditors.

## Component diagram

```mermaid
flowchart TB
    subgraph Frontends
        admin["Admin SPA<br/>React 19 + Vite"]
        voting["Voting App<br/>Next.js"]
        audit["Auditing App<br/>Next.js"]
    end

    subgraph Services
        auth["Auth / IdP<br/>Elysia + better-auth"]
        api["Elections API<br/>Elysia + Drizzle"]
    end

    subgraph "Blockchain (torachain-cli)"
        master["Master<br/>pBFT coordinator + Express API"]
        workers["Workers ×N<br/>validate & replicate"]
        pubsub{{"Google Cloud Pub/Sub"}}
    end

    ext["External Eligibility API"]
    authdb[("Auth Postgres")]
    apidb[("Elections Postgres")]
    chaindb[("Chain Postgres")]

    admin & voting & audit -->|session cookie / JWT| auth
    admin & voting & audit -->|REST| api
    api -->|/core voter lookup| auth
    api -->|eligibility / enroll| ext
    api -->|POST /api/vote| master
    master <-->|publish/subscribe| pubsub
    pubsub <--> workers

    auth --- authdb
    api --- apidb
    master --- chaindb
```

## Voting flow

```mermaid
sequenceDiagram
    participant V as Voter (voting-fe)
    participant A as Auth
    participant B as Elections API
    participant E as Eligibility API
    participant M as Chain Master
    participant W as Chain Workers

    V->>A: sign in (session cookie)
    V->>B: enroll for election
    B->>E: check eligibility
    E-->>B: eligible + external id
    B-->>V: voting number
    V->>B: cast vote (candidate)
    B->>B: record ballot
    B-)M: submitVote() (fire-and-forget)
    M->>W: pBFT round (VALIDATE_BLOCK)
    W-->>M: computed hashes (BLOCK_VALIDATED)
    M->>W: publish accepted block (NEW_BLOCK)
    Note over M,W: ⌈2n/3⌉ agreement required
```

## Design decisions

| Choice                                           | Why                                                                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Separate auth service, 3 identity domains**    | Voters, admins, and auditors have different lifecycles and trust levels; table-prefix isolation keeps them independent while sharing one database and one codebase.                                    |
| **Fire-and-forget vote submission to the chain** | The ballot is recorded synchronously in Postgres; chain replication is asynchronous so voter latency never depends on consensus. A `Null` chain client keeps tests and chain-less deployments working. |
| **Per-election blockchain**                      | Each election is an isolated chain with its own genesis block, so one election's load or history never affects another.                                                                                |
| **pBFT over Pub/Sub**                            | Byzantine fault tolerance gives auditable integrity without proof-of-work cost; Pub/Sub decouples the master from workers so nodes can run anywhere.                                                   |
| **External eligibility API**                     | Real voter registries are owned by third parties; delegating eligibility via a documented HTTP contract keeps ToraChain registry-agnostic.                                                             |

## Where the code lives

| Concern             | Location                                              | Module doc                             |
| ------------------- | ----------------------------------------------------- | -------------------------------------- |
| Identity & sessions | `apps/auth`                                           | [auth.md](auth.md)                     |
| Elections / votes   | `apps/backend`                                        | [backend.md](backend.md)               |
| User interfaces     | `apps/admin-fe`, `apps/voting-fe`, `apps/auditing-fe` | [frontends.md](frontends.md)           |
| Consensus & ledger  | `apps/torachain-cli`                                  | [blockchain.md](blockchain.md)         |
| Data model          | Drizzle `model.ts` per module                         | [erd.md](erd.md)                       |
| Deploy / infra      | `iac/`                                                | [infrastructure.md](infrastructure.md) |
