import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { SerializedBlock } from "@tora-chain/specs";
import type { BlockStore } from "./store.ts";

// Stores the chain as a pretty-printed JSON array so non-technical users can
// open the file and read it directly.
export class JsonBlockStore implements BlockStore {
  private blocks: SerializedBlock[] = [];

  constructor(private readonly filePath: string) {}

  async init(): Promise<void> {
    if (existsSync(this.filePath)) {
      this.blocks = JSON.parse(readFileSync(this.filePath, "utf8"));
    }
  }

  async append(block: SerializedBlock): Promise<void> {
    const exists = this.blocks.some(
      (b) => b.electionId === block.electionId && b.index === block.index,
    );
    if (exists) return;
    this.blocks.push(block);
    this.blocks.sort(
      (a, b) => a.electionId.localeCompare(b.electionId) || a.index - b.index,
    );
    writeFileSync(this.filePath, JSON.stringify(this.blocks, null, 2) + "\n");
  }

  async getAll(electionId?: string): Promise<SerializedBlock[]> {
    if (!electionId) return [...this.blocks];
    return this.blocks.filter((b) => b.electionId === electionId);
  }

  async getLatest(electionId: string): Promise<SerializedBlock | null> {
    const chain = this.blocks.filter((b) => b.electionId === electionId);
    return chain.length > 0 ? chain[chain.length - 1]! : null;
  }

  async count(): Promise<number> {
    return this.blocks.length;
  }

  async close(): Promise<void> {}
}
