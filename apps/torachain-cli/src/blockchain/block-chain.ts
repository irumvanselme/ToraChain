import type { SerializedBlock } from "@tora-chain/specs";
import { ElectionBlock, GENESIS_INDEX } from "./block.ts";
import { ElectionsBlockData } from "./block-data.ts";
import type { IBlockChainStorageService } from "./storage-service.ts";

export interface ElectionBlockInput {
  voter: bigint;
  commitment: string;
}

/** Outcome of taking in a block that was built somewhere else. */
export type AcceptResult =
  /** Verified and appended on top of the chain's tip. */
  | { status: "appended"; block: ElectionBlock }
  /**
   * Verified and appended, but its parent has not arrived yet — pub/sub makes
   * no ordering promise, so a later block can overtake an earlier one.
   */
  | { status: "out-of-order"; block: ElectionBlock }
  /** Already held at that index; nothing to do. */
  | { status: "duplicate" }
  | { status: "rejected"; reason: "invalid-hash" | "wrong-election" };

export interface BlockChainOptions {
  /**
   * Called once a block has been appended *and* persisted — never for blocks
   * hydrated out of storage. The master publishes from here, so every block it
   * commits (genesis included) reaches the workers exactly once.
   */
  onAppend?: (block: ElectionBlock) => void;
}

/**
 * One election's append-only chain, held in memory as {@link ElectionBlock}s
 * and persisted through an injected {@link IBlockChainStorageService}.
 *
 * The chain is the single place blocks are built, hashed and verified: the
 * master appends votes with {@link addBlock}, a worker takes in the blocks it
 * receives with {@link accept}, and both persist as a side effect. Serialized
 * JSON crosses the boundary in {@link serialize} / {@link deserialize} only.
 */
export class BlockChain {
  private constructor(
    private readonly election: string,
    private readonly storage: IBlockChainStorageService,
    private readonly blocks: ElectionBlock[],
    private readonly options: BlockChainOptions,
  ) {}

  /** Read one election's chain out of storage and rebuild it in memory. */
  static async load(
    election: string,
    storage: IBlockChainStorageService,
    options: BlockChainOptions = {},
  ): Promise<BlockChain> {
    const persisted = await storage.getAll(election);
    return new BlockChain(
      election,
      storage,
      BlockChain.deserialize(persisted),
      options,
    );
  }

  /** Rebuild blocks from their persisted form, ordered by index. */
  static deserialize(blocks: readonly SerializedBlock[]): ElectionBlock[] {
    return [...blocks]
      .sort((a, b) => a.index - b.index)
      .map((block) => ElectionBlock.fromJSON(block));
  }

  /** The chain in its persisted / wire form. */
  public serialize(): SerializedBlock[] {
    return this.blocks.map((block) => block.toJSON());
  }

  /**
   * Record a vote: build the next block on top of the tip, persist it, and
   * return it. Opens the chain with a genesis block first if this is the
   * election's first vote.
   */
  public async addBlock(input: ElectionBlockInput): Promise<ElectionBlock> {
    const previous = this.tip ?? (await this.appendGenesis());
    const block = previous.next(
      new ElectionsBlockData(input.voter, input.commitment),
    );
    await this.append(block);
    return block;
  }

  /**
   * Take in a block built elsewhere — received over pub/sub or pulled from the
   * master during sync. The block is rehydrated and re-hashed locally, and only
   * persisted if the hash it claims is the one this node computes; that check
   * is the whole reason a worker replicates rather than trusts.
   */
  public async accept(serialized: SerializedBlock): Promise<AcceptResult> {
    if (serialized.electionId !== this.election) {
      return { status: "rejected", reason: "wrong-election" };
    }

    let block: ElectionBlock;
    try {
      block = ElectionBlock.fromJSON(serialized);
    } catch {
      // Non-hex hash or unparsable voter id — malformed is untrustworthy.
      return { status: "rejected", reason: "invalid-hash" };
    }

    if (!block.IsValid()) return { status: "rejected", reason: "invalid-hash" };
    if (this.has(block.blockIndex)) return { status: "duplicate" };

    const linked = this.isLinked(block);
    await this.append(block);
    return { status: linked ? "appended" : "out-of-order", block };
  }

  /** Re-hash every block and check every link, genesis first. */
  public isValid(): boolean {
    let previous: ElectionBlock | null = null;
    for (const block of this.blocks) {
      if (!block.IsValid()) return false;
      if (previous === null) {
        if (block.blockIndex !== GENESIS_INDEX) return false;
      } else if (!block.follows(previous)) {
        return false;
      }
      previous = block;
    }
    return true;
  }

  public has(index: number): boolean {
    return this.at(index) !== undefined;
  }

  public at(index: number): ElectionBlock | undefined {
    return this.blocks.find((block) => block.blockIndex === index);
  }

  // Is the block's parent already here, and does it really sit on it? False
  // for a block that overtook its parent in delivery — not for one that
  // arrives late to fill a gap.
  private isLinked(block: ElectionBlock): boolean {
    if (block.blockIndex === GENESIS_INDEX) return true;
    const parent = this.at(block.blockIndex - 1);
    return parent !== undefined && block.follows(parent);
  }

  private async appendGenesis(): Promise<ElectionBlock> {
    const genesis = ElectionBlock.genesis(this.election);
    await this.append(genesis);
    return genesis;
  }

  private async append(block: ElectionBlock): Promise<void> {
    // Persist before publishing/holding it: a tip that never reached storage
    // would have the next block build on a link no other node can see.
    await this.storage.append(block.toJSON());
    this.insertInOrder(block);
    this.options.onAppend?.(block);
  }

  // Blocks normally arrive in order and land at the end; an overtaking block
  // walks back to its place so the tip is always the highest index held.
  private insertInOrder(block: ElectionBlock): void {
    let at = this.blocks.length;
    while (at > 0 && this.blocks[at - 1]!.blockIndex > block.blockIndex) at--;
    this.blocks.splice(at, 0, block);
  }

  get tip(): ElectionBlock | null {
    return this.blocks[this.blocks.length - 1] ?? null;
  }

  get length(): number {
    return this.blocks.length;
  }

  get isEmpty(): boolean {
    return this.blocks.length === 0;
  }

  get electionId(): string {
    return this.election;
  }
}
