import type { SerializedBlock } from "@tora-chain/specs";

/**
 * The chain's persistence port — the only thing a {@link BlockChain} knows
 * about storage, injected into it so the chain logic never depends on where
 * blocks live (Postgres for the master, a JSON file for a worker, memory in
 * tests).
 *
 * Implementations only ever see a block in its serialized form: JSON is the
 * persistence format, not the structure the chain works with.
 */
export interface IBlockChainStorageService {
  /** Prepare the backing store (create tables, read the file, …). */
  init(): Promise<void>;
  /**
   * Persist one block. Must be idempotent per
   * `(electionId, index)` — pub/sub redelivers, and a redelivered block must
   * not become a second entry.
   */
  append(block: SerializedBlock): Promise<void>;
  /**
   * Every stored block, in chain order; one election's when given an id. A
   * chain reads this once, at load — from then on it knows its own tip.
   */
  getAll(electionId?: string): Promise<SerializedBlock[]>;
  /** Total blocks stored, across every election. */
  count(): Promise<number>;
  close(): Promise<void>;
}
