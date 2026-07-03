import type { SerializedBlock } from "@tora-chain/specs";

// Common persistence contract. The master uses Postgres (JSON fallback in
// dev); subscribers always use a local JSON file for easy inspection.
export interface BlockStore {
  init(): Promise<void>;
  append(block: SerializedBlock): Promise<void>;
  getAll(electionId?: string): Promise<SerializedBlock[]>;
  getLatest(electionId: string): Promise<SerializedBlock | null>;
  count(): Promise<number>;
  close(): Promise<void>;
}
