# ToraChain State Diagrams

State-machine diagrams for the two core lifecycles in ToraChain.

- [Election Lifecycle](#election-lifecycle)
- [Vote Lifecycle](#vote-lifecycle)

---

## Election Lifecycle

Admin-driven `status` machine (`elections/model.ts`, transitions in
`elections/utils.ts`). `paused` has no defined exit; `archived` is terminal.

```mermaid
stateDiagram
    [*] --> draft

    draft --> enrolling_voters
    draft --> scheduled
    draft --> active

    enrolling_voters --> scheduled
    enrolling_voters --> paused

    scheduled --> active
    scheduled --> paused

    active --> ended
    active --> paused

    ended --> archived

    archived --> [*]
```

---

## Vote Lifecycle

From voter enrollment, through ballot casting, to on-chain anchoring
(`integrations/`, `votes/`, `torachain-cli`).

```mermaid
stateDiagram
    [*] --> NoVoter

    NoVoter --> NotEligible : enroll (rejected)
    NoVoter --> Eligible : enroll (approved)
    Eligible --> Revoked : revoke
    Revoked --> Eligible : re-enroll

    Eligible --> Voted : cast
    Voted --> Committed : submit to chain
    Committed --> WorkerAccepted : re-hash ok
    Committed --> WorkerRejected : re-hash mismatch

    NotEligible --> [*]
    WorkerAccepted --> [*]
    WorkerRejected --> [*]
```
