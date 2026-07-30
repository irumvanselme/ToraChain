import type { SerializedBlock } from "@tora-chain/specs";
import type { IBlockChainStorageService } from "../storage-service.ts";

/**
 * A storage service that keeps blocks in an array — the whole point of the
 * chain taking its storage as a dependency. `appended` records every call so a
 * test can assert what was persisted, and in what form.
 */
export class InMemoryBlockChainStorageService implements IBlockChainStorageService {
  readonly appended: SerializedBlock[] = [];
  private readonly blocks: SerializedBlock[] = [];

  constructor(seed: readonly SerializedBlock[] = []) {
    this.blocks = [...seed];
  }

  async init(): Promise<void> {}

  async append(block: SerializedBlock): Promise<void> {
    this.appended.push(block);
    const exists = this.blocks.some(
      (b) => b.electionId === block.electionId && b.index === block.index,
    );
    if (exists) return;
    this.blocks.push(block);
    this.blocks.sort(
      (a, b) => a.electionId.localeCompare(b.electionId) || a.index - b.index,
    );
  }

  async getAll(electionId?: string): Promise<SerializedBlock[]> {
    if (!electionId) return [...this.blocks];
    return this.blocks.filter((b) => b.electionId === electionId);
  }

  async count(): Promise<number> {
    return this.blocks.length;
  }

  async close(): Promise<void> {}
}
