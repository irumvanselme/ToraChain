import { Database } from "bun:sqlite";
import type { SerializedBlock } from "@tora-chain/specs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS blocks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  block_index  INTEGER NOT NULL,
  election_id  TEXT    NOT NULL,
  voter_id     TEXT    NOT NULL,
  candidate_id TEXT    NOT NULL,
  timestamp    INTEGER NOT NULL,
  prev_hash    TEXT    NOT NULL,
  hash         TEXT    NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_blocks_index ON blocks (block_index);
CREATE INDEX IF NOT EXISTS idx_blocks_election ON blocks (election_id);
`;

export class BlockStore {
  private readonly db: Database;

  constructor(dbPath: string = ":memory:") {
    this.db = new Database(dbPath, { create: true });
    this.db.exec(SCHEMA);
  }

  append(block: SerializedBlock): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO blocks
         (block_index, election_id, voter_id, candidate_id, timestamp, prev_hash, hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        block.index,
        block.electionId,
        block.data.voter,
        block.data.candidate,
        block.timestamp,
        block.prevHash,
        block.hash,
      );
  }

  getAll(): SerializedBlock[] {
    const rows = this.db
      .prepare(
        `SELECT block_index, election_id, voter_id, candidate_id, timestamp, prev_hash, hash
         FROM blocks ORDER BY block_index ASC`,
      )
      .all() as Array<{
      block_index: number;
      election_id: string;
      voter_id: string;
      candidate_id: string;
      timestamp: number;
      prev_hash: string;
      hash: string;
    }>;

    return rows.map((r) => ({
      index: r.block_index,
      electionId: r.election_id,
      data: { voter: r.voter_id, candidate: r.candidate_id },
      timestamp: r.timestamp,
      prevHash: r.prev_hash,
      hash: r.hash,
    }));
  }

  getLatest(): SerializedBlock | null {
    const row = this.db
      .prepare(
        `SELECT block_index, election_id, voter_id, candidate_id, timestamp, prev_hash, hash
         FROM blocks ORDER BY block_index DESC LIMIT 1`,
      )
      .get() as
      | {
          block_index: number;
          election_id: string;
          voter_id: string;
          candidate_id: string;
          timestamp: number;
          prev_hash: string;
          hash: string;
        }
      | undefined;

    if (!row) return null;
    return {
      index: row.block_index,
      electionId: row.election_id,
      data: { voter: row.voter_id, candidate: row.candidate_id },
      timestamp: row.timestamp,
      prevHash: row.prev_hash,
      hash: row.hash,
    };
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as n FROM blocks")
      .get() as { n: number };
    return row.n;
  }

  close(): void {
    this.db.close();
  }
}
