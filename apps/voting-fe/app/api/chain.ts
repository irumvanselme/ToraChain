import { chainNodeLink } from "@tora-chain/configs";

import { idToBigInt } from "../lib/receipt.ts";

// The blockchain node exposes a public, CORS-open `GET /api/chain`. Reading it
// directly from the voter's browser (instead of proxying through the backend)
// is what makes the on-chain commitment an *independent* cross-check: a lying
// backend cannot fabricate a matching block here.

export interface ChainBlock {
  index: number;
  electionId?: string;
  data: { voter: string; commitment: string };
  timestamp: number;
  prevHash: string;
  hash: string;
}

export type ChainLookup =
  | { status: "match"; block: ChainBlock }
  | { status: "mismatch"; block: ChainBlock }
  | { status: "absent" }
  | { status: "unreachable"; error: string };

/**
 * Look up the on-chain block for a voting number and check whether it anchors
 * the given commitment. Never throws — chain-node problems degrade the result
 * to `unreachable` rather than blocking verification.
 */
export async function checkOnChain(
  electionId: string,
  votingNumber: string,
  commitment: string,
  signal?: AbortSignal,
): Promise<ChainLookup> {
  let blocks: ChainBlock[];
  try {
    const url = `${chainNodeLink}/api/chain?electionId=${encodeURIComponent(electionId)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      return {
        status: "unreachable",
        error: `Chain node returned ${res.status}.`,
      };
    }
    const body = (await res.json()) as { blocks?: ChainBlock[] };
    blocks = body.blocks ?? [];
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return {
      status: "unreachable",
      error: "Could not reach the blockchain node.",
    };
  }

  const voterKey = (await idToBigInt(votingNumber)).toString();
  const block = blocks.find((b) => b.data?.voter === voterKey);
  if (!block) return { status: "absent" };
  return block.data.commitment === commitment
    ? { status: "match", block }
    : { status: "mismatch", block };
}
