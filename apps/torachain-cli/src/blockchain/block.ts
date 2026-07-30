import type { SerializedBlock } from "@tora-chain/specs";
import { bigIntToHex, hash, hexToBigInt } from "./hashing.ts";
import { ElectionsBlockData } from "./block-data.ts";

/** Index of the genesis block that opens every election's chain. */
export const GENESIS_INDEX = 0;

/**
 * The genesis block's hash is fixed by the protocol at 0 ("0" on the wire): it
 * commits to no predecessor and carries no vote, so there is nothing to hash.
 * A node accepts a block at {@link GENESIS_INDEX} only with this sentinel.
 */
export const GENESIS_HASH = 0n;

export class ElectionBlock {
  private readonly _hash: bigint;

  constructor(
    private readonly index: number,
    private readonly election: string,
    private readonly data: ElectionsBlockData,
    private readonly timestamp: number,
    private readonly hashOfPreviousBlock: bigint,
    /**
     * The hash a rehydrated block *claims* — the one it was stored with or
     * arrived with over pub/sub. Blocks built locally omit it and take the hash
     * computed here; for rehydrated ones {@link IsValid} compares the claim
     * against a fresh local computation, and that is what catches tampering.
     */
    claimedHash?: bigint,
  ) {
    this._hash = claimedHash ?? this.computeHash();
  }

  /** The block that opens `election`'s chain. */
  static genesis(election: string, timestamp: number = Date.now()) {
    return new ElectionBlock(
      GENESIS_INDEX,
      election,
      new ElectionsBlockData(0n, "0"),
      timestamp,
      GENESIS_HASH,
    );
  }

  /**
   * Rehydrate a persisted or received block, keeping the hash it claims so it
   * can still be checked. Throws if the hashes are not valid hex.
   */
  static fromJSON(json: SerializedBlock) {
    return new ElectionBlock(
      json.index,
      json.electionId,
      ElectionsBlockData.fromJSON(json.data),
      json.timestamp,
      hexToBigInt(json.prevHash),
      hexToBigInt(json.hash),
    );
  }

  /** Build the block that extends this one, chained onto its hash. */
  public next(data: ElectionsBlockData, timestamp: number = Date.now()) {
    return new ElectionBlock(
      this.index + 1,
      this.election,
      data,
      timestamp,
      this._hash,
    );
  }

  private computeHash(): bigint {
    if (this.index === GENESIS_INDEX) return GENESIS_HASH;
    const blockData = [
      this.index,
      this.data.toJSON(),
      this.timestamp,
      this.hashOfPreviousBlock,
    ];
    return hash(blockData);
  }

  /**
   * A worker re-computes the hash of every received block;
   * a mismatch means the block was tampered with in transit, and it is rejected.
   */
  public IsValid(): boolean {
    return this._hash === this.computeHash();
  }

  /** Does this block sit directly on top of `previous`? */
  public follows(previous: ElectionBlock): boolean {
    return (
      this.index === previous.index + 1 &&
      this.hashOfPreviousBlock === previous.hash &&
      this.election === previous.election
    );
  }

  /** The persisted / wire form of the block. Storage and pub/sub only. */
  public toJSON(): SerializedBlock {
    return {
      index: this.index,
      electionId: this.election,
      data: this.data.toJSON(),
      timestamp: this.timestamp,
      prevHash: bigIntToHex(this.hashOfPreviousBlock),
      hash: bigIntToHex(this._hash),
    };
  }

  get hash() {
    return this._hash;
  }

  get blockIndex() {
    return this.index;
  }

  get electionId() {
    return this.election;
  }
}
