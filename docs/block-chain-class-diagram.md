# Blockchain Class Diagram

This diagram covers the ToraChain blockchain entities in `apps/torachain-cli`:
the core in-memory chain library (`src/blockchain/`) and the persisted
wire-format shapes from `@tora-chain/specs`. Each election has its own chain
with its own genesis block.

```mermaid
classDiagram
    direction LR

    %% ── Core chain entities (src/blockchain) ─────────────────────────
    class BlockChain {
        -string election
        -ElectionBlock[] blocks
        -IBlockChainStorageService storage
        +load(election, storage, options)$ Promise~BlockChain~
        +deserialize(blocks: SerializedBlock[])$ ElectionBlock[]
        +serialize() SerializedBlock[]
        +addBlock(input: ElectionBlockInput) Promise~ElectionBlock~
        +accept(block: SerializedBlock) Promise~AcceptResult~
        +isValid() boolean
        +get tip() ElectionBlock
    }

    class ElectionBlock {
        -number index
        -string election
        -ElectionsBlockData data
        -number timestamp
        -bigint hashOfPreviousBlock
        -bigint _hash
        +genesis(election, timestamp)$ ElectionBlock
        +fromJSON(json: SerializedBlock)$ ElectionBlock
        +next(data, timestamp) ElectionBlock
        +IsValid() boolean
        +follows(previous: ElectionBlock) boolean
        +toJSON() SerializedBlock
        +get hash() bigint
    }

    class ElectionsBlockData {
        -bigint voter
        -string commitment
        +fromJSON(json: BlockData)$ ElectionsBlockData
        +toJSON() BlockData
    }

    class ElectionBlockInput {
        <<interface>>
        +bigint voter
        +string commitment
    }

    class IBlockChainStorageService {
        <<interface>>
        +init() Promise~void~
        +append(block: SerializedBlock) Promise~void~
        +getAll(electionId?) Promise~SerializedBlock[]~
        +getLatest(electionId) Promise~SerializedBlock~
        +count() Promise~number~
        +close() Promise~void~
    }

    class PostgresBlockStore
    class JsonBlockStore

    %% ── Persisted wire format (@tora-chain/specs) ────────────────────
    class SerializedBlock {
        <<interface>>
        +number index
        +string electionId
        +BlockData data
        +number timestamp
        +string prevHash
        +string hash
    }

    class BlockData {
        <<interface>>
        +string voter
        +string commitment
    }

    %% ── Relationships ────────────────────────────────────────────────
    BlockChain "1" o-- "*" ElectionBlock : holds
    ElectionBlock "1" *-- "1" ElectionsBlockData : contains
    BlockChain ..> ElectionBlockInput : accepts
    BlockChain o-- "1" IBlockChainStorageService : persists through
    IBlockChainStorageService <|.. PostgresBlockStore : implements
    IBlockChainStorageService <|.. JsonBlockStore : implements
    SerializedBlock "1" *-- "1" BlockData : contains
    BlockData "1" --o "1" ElectionsBlockData : serialized as
    ElectionBlock ..> SerializedBlock : serialized as
    IBlockChainStorageService ..> SerializedBlock : stores
```

## The `blocks` table (Postgres)

The master persists each block to the `blocks` table. The composite primary key
`(election_id, block_index)` makes inserts idempotent, so replayed Pub/Sub
messages never duplicate a block.

| Column        | Type      | Notes                                          |
| ------------- | --------- | ---------------------------------------------- |
| `election_id` | `TEXT`    | PK part 1 — one chain per election             |
| `block_index` | `INTEGER` | PK part 2 — position in that election's chain  |
| `voter_id`    | `TEXT`    | maps to `SerializedBlock.data.voter`           |
| `commitment`  | `TEXT`    | SHA-256 hex commitment to the encrypted ballot |
| `timestamp`   | `BIGINT`  | epoch millis                                   |
| `prev_hash`   | `TEXT`    | hash of the previous block (`"0"` for genesis) |
| `hash`        | `TEXT`    | this block's hash (lowercase hex)              |

## Notes

- **Two representations of a block.** The core library (`ElectionBlock` /
  `ElectionsBlockData`) uses `bigint` fields and computes hashes; the wire /
  storage format (`SerializedBlock` / `BlockData`) uses strings so master and
  workers hash the identical form. `commitment` is always a string —
  round-tripping it through `bigint` would drop leading zeros and diverge the
  hash. `serialize()` / `deserialize()` are the only crossing points: JSON is
  what gets persisted and published, never what the logic works with.
- **Per-election chains.** A `BlockChain` is scoped to one `election`; the
  first `addBlock` opens it with that election's genesis block.
- **Injected storage.** A chain is loaded with an `IBlockChainStorageService`
  (`BlockChain.load(electionId, storage)`) and persists each block before
  holding it, so a tip always exists somewhere other nodes can see.
- **Tamper detection.** `ElectionBlock.fromJSON` keeps the hash a block claims;
  `IsValid()` re-computes it and a worker's `accept()` refuses the mismatch.
  `BlockChain.isValid()` does the same across a whole chain, links included.
- **Genesis.** Index `0`, hash fixed at `"0"` by the protocol — it commits to no
  predecessor, so there is nothing to hash. Anything else at index `0` is
  rejected.
