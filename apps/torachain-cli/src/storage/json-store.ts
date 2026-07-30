import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { SerializedBlock } from "@tora-chain/specs";
import type { IBlockChainStorageService } from "../blockchain/index.ts";

// Stores the chain as a pretty-printed JSON array so non-technical users can
// open the file and read it directly. JSON is only this file's storage format —
// the chain itself works with ElectionBlock objects.
export class JsonBlockStore implements IBlockChainStorageService {
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

  async count(): Promise<number> {
    return this.blocks.length;
  }

  async close(): Promise<void> {}
}
