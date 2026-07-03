# Entity-Relationship Diagram

The data model is split across three databases, one per service, so no service
reaches into another's tables — they integrate over HTTP instead.

- **Auth DB** — users per identity domain (`voter_*`, `admin_*`, `auditor_*`
  table prefixes), sessions, JWTs, API keys, auditor organizations.
- **Elections DB** — elections, candidates, eligibility, ballots, integrations.
- **Chain DB** — persisted blocks per election (master node).

## Elections data model

```mermaid
erDiagram
    ELECTION ||--o{ CANDIDATE : has
    ELECTION ||--o{ ELIGIBILITY : grants
    ELECTION ||--o| ELECTION_INTEGRATION : configures
    VOTER ||--o{ ELIGIBILITY : holds
    ELIGIBILITY ||--o| VOTE : casts
    CANDIDATE ||--o{ VOTE : receives
    OBSERVER }o--o{ ELECTION : monitors

    ELECTION {
        uuid election_id PK
        bigint election_address UK
        string title
        string status
        timestamp start_time
        timestamp end_time
    }
    CANDIDATE {
        uuid candidate_id PK
        bigint candidate_address UK
        uuid election_id FK
        string name
    }
    VOTER {
        uuid voter_id PK
        string email
        string status
    }
    ELIGIBILITY {
        uuid eligibility_id PK
        bigint voting_address UK
        uuid voter_id FK
        uuid election_id FK
        bool has_voted
    }
    VOTE {
        uuid vote_id PK
        uuid eligibility_id FK
        uuid candidate_id FK
        timestamp cast_at
    }
    ELECTION_INTEGRATION {
        uuid id PK
        uuid election_id FK
        string type
        jsonb config
        jsonb form_fields
    }
    OBSERVER {
        uuid observer_id PK
        string organization
    }
```

## Blockchain data model

Every recorded vote becomes a block; blocks are chained by hash per election.

```mermaid
erDiagram
    CHAIN ||--o{ BLOCK : contains
    CHAIN {
        bigint election_id PK
    }
    BLOCK {
        int index PK
        string hash
        string previous_hash
        timestamp created_at
        bigint election
        bigint voter
        bigint candidate
    }
```

See [uml/classDiagram.md](uml/classDiagram.md) for the object model
(`ElectionsBlock`, `ElectionsBlockChain`) and the domain class diagram.

> The source of truth for tables is each module's Drizzle `model.ts`
> (`apps/backend/app/**/model.ts`) and the better-auth schema in `apps/auth`.
