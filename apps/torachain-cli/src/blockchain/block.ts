import { hash } from "./hashing.ts";
import { ElectionsBlockData } from "./block-data.ts";

export class ElectionBlock {
  private readonly _hash: bigint;

  constructor(
    private readonly index: number,
    private readonly data: ElectionsBlockData,
    private readonly timestamp: number,
    private readonly hashOfPreviousBlock: bigint,
  ) {
    const blockData = [index, data.toJSON(), timestamp, hashOfPreviousBlock];
    this._hash = hash(blockData);
  }

  /**
   * A worker re-computes the hash of every received block;
   * a mismatch means the block was tampered with in transit, and it is rejected.
   */
  public IsValid(): boolean {
    const blockData = [
      this.index,
      this.data.toJSON(),
      this.timestamp,
      this.hashOfPreviousBlock,
    ];
    return this.hash === hash(blockData);
  }

  public toJSON() {
    return {
      index: this.index,
      data: this.data.toJSON(),
      timestamp: this.timestamp,
      hashOfPreviousBlock: this.hashOfPreviousBlock.toString(),
    };
  }

  get hash() {
    return this._hash;
  }
}
