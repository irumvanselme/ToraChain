import pg from "pg";
import type { SerializedBlock } from "@tora-chain/specs";
import type { BlockStore } from "./store.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS blocks (
  election_id  TEXT   NOT NULL,
  block_index  INTEGER NOT NULL,
  voter_id     TEXT   NOT NULL,
  candidate_id TEXT   NOT NULL,
  timestamp    BIGINT NOT NULL,
  prev_hash    TEXT   NOT NULL,
  hash         TEXT   NOT NULL,
  PRIMARY KEY (election_id, block_index)
);
`;

interface BlockRow {
  election_id: string;
  block_index: number;
  voter_id: string;
  candidate_id: string;
  timestamp: string;
  prev_hash: string;
  hash: string;
}

function toBlock(row: BlockRow): SerializedBlock {
  return {
    index: row.block_index,
    electionId: row.election_id,
    data: { voter: row.voter_id, candidate: row.candidate_id },
    timestamp: Number(row.timestamp),
    prevHash: row.prev_hash,
    hash: row.hash,
  };
}

export class PostgresBlockStore implements BlockStore {
  private readonly pool: pg.Pool;

  constructor(uri: string) {
    this.pool = new pg.Pool({
      connectionString: uri,
      ssl: /sslmode=require/.test(uri)
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  async init(): Promise<void> {
    await this.pool.query(SCHEMA);
  }

  async append(block: SerializedBlock): Promise<void> {
    await this.pool.query(
      `INSERT INTO blocks
         (election_id, block_index, voter_id, candidate_id, timestamp, prev_hash, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (election_id, block_index) DO NOTHING`,
      [
        block.electionId,
        block.index,
        block.data.voter,
        block.data.candidate,
        block.timestamp,
        block.prevHash,
        block.hash,
      ],
    );
  }

  async getAll(electionId?: string): Promise<SerializedBlock[]> {
    const result = electionId
      ? await this.pool.query<BlockRow>(
          "SELECT * FROM blocks WHERE election_id = $1 ORDER BY block_index ASC",
          [electionId],
        )
      : await this.pool.query<BlockRow>(
          "SELECT * FROM blocks ORDER BY election_id ASC, block_index ASC",
        );
    return result.rows.map(toBlock);
  }

  async getLatest(electionId: string): Promise<SerializedBlock | null> {
    const result = await this.pool.query<BlockRow>(
      "SELECT * FROM blocks WHERE election_id = $1 ORDER BY block_index DESC LIMIT 1",
      [electionId],
    );
    const row = result.rows[0];
    return row ? toBlock(row) : null;
  }

  async count(): Promise<number> {
    const result = await this.pool.query<{ n: string }>(
      "SELECT COUNT(*) AS n FROM blocks",
    );
    return Number(result.rows[0]?.n ?? 0);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
